// TODO: dhtPort and torrentPort should be consistent between restarts
// TODO: peerId and nodeId should be consistent between restarts

module.exports = WebTorrent

var createTorrent = require('create-torrent')
var debug = require('debug')('webtorrent')
var DHT = require('bittorrent-dht/client') // browser exclude
var EventEmitter = require('events').EventEmitter
var extend = require('extend.js')
var FSStorage = require('./lib/fs-storage') // browser exclude
var hat = require('hat')
var inherits = require('inherits')
var loadIPSet = require('load-ip-set') // browser exclude
var parallel = require('run-parallel')
var parseTorrent = require('parse-torrent')
var Server = require('./lib/server') // browser exclude
var speedometer = require('speedometer')
var Storage = require('./lib/storage')
var Torrent = require('./lib/torrent')

inherits(WebTorrent, EventEmitter)

/**
 * WebTorrent Client
 * @param {Object} opts
 */
function WebTorrent (opts) {
  var self = this
  if (!(self instanceof WebTorrent)) return new WebTorrent(opts)
  if (!opts) opts = {}
  EventEmitter.call(self)

  self.listening = false
  self.torrentPort = opts.torrentPort || 0
  self.tracker = (opts.tracker !== undefined) ? opts.tracker : true
  self.torrents = []

  self.downloadSpeed = speedometer()
  self.uploadSpeed = speedometer()

  self.storage = typeof opts.storage === 'function'
    ? opts.storage
    : (opts.storage !== false && typeof FSStorage === 'function' /* browser exclude */)
      ? FSStorage
      : Storage

  self.peerId = opts.peerId === undefined
    ? new Buffer('-WW0001-' + hat(48), 'utf8')
    : typeof opts.peerId === 'string'
      ? new Buffer(opts.peerId, 'utf8')
      : opts.peerId
  self.peerIdHex = self.peerId.toString('hex')

  self.nodeId = opts.nodeId === undefined
    ? new Buffer(hat(160), 'hex')
    : typeof opts.nodeId === 'string'
      ? new Buffer(opts.nodeId, 'hex')
      : opts.nodeId
  self.nodeIdHex = self.nodeId.toString('hex')

  // TODO: implement webtorrent-dht
  if (opts.dht !== false && typeof DHT === 'function' /* browser exclude */) {
    // use a single DHT instance for all torrents, so the routing table can be reused
    self.dht = new DHT(extend({ nodeId: self.nodeId }, opts.dht))
    self.dht.listen(opts.dhtPort)
  }

  debug('new webtorrent (peerId %s, nodeId %s)', self.peerIdHex, self.nodeIdHex)

  // TODO: this is probably broken
  if (opts.list) return

  if (opts.port !== false && typeof Server === 'function' /* browser exclude */) {
    self.server = new Server(self, opts.port)
    self.server.on('listening', function () {
      self.listening = true
      self.emit('listening')
    })
  }

  if (typeof loadIPSet === 'function') {
    loadIPSet(opts.blocklist, function (err, ipSet) {
      self.blocked = ipSet
      ready()
    })
  } else process.nextTick(ready)

  function ready () {
    self.ready = true
    self.emit('ready')
  }
}

/**
 * Seed ratio for all torrents in the client.
 * @type {number}
 */
Object.defineProperty(WebTorrent.prototype, 'ratio', {
  get: function () {
    var self = this
    var uploaded = self.torrents.reduce(function (total, torrent) {
      return total + torrent.uploaded
    }, 0)
    var downloaded = self.torrents.reduce(function (total, torrent) {
      return total + torrent.downloaded
    }, 0) || 1
    return uploaded / downloaded
  }
})

/**
 * Returns the torrent with the given `torrentId`. Convenience method. Easier than
 * searching through the `client.torrents` array.
 *
 * @param  {string|Buffer|Object} torrentId
 * @return {Torrent}
 */
WebTorrent.prototype.get = function (torrentId) {
  var self = this
  var parsed = parseTorrent(torrentId)
  if (!parsed || !parsed.infoHash) return null
  for (var i = 0, len = self.torrents.length; i < len; i++) {
    var torrent = self.torrents[i]
    if (torrent.infoHash === parsed.infoHash) return torrent
  }
  return null
}

/**
 * Start downloading a new torrent. Aliased as `client.download`.
 *
 * `torrentId` can be one of:
 *   - magnet uri (utf8 string)
 *   - torrent file (buffer)
 *   - info hash (hex string or buffer)
 *   - parsed torrent (from [parse-torrent](https://github.com/feross/parse-torrent))
 *   - http/https url to a .torrent file (string)
 *   - filesystem path to a .torrent file (string)
 *
 * @param {string|Buffer|Object} torrentId
 * @param {Object} opts torrent-specific options
 * @param {function=} ontorrent called when the torrent is ready (has metadata)
 */
WebTorrent.prototype.add =
WebTorrent.prototype.download = function (torrentId, opts, ontorrent) {
  var self = this
  debug('add %s', torrentId)
  if (typeof opts === 'function') {
    ontorrent = opts
    opts = {}
  }
  if (!opts) opts = {}

  opts.client = self
  opts.storage = opts.storage || self.storage

  // TODO: fix this to work with multiple torrents. this should probably be in cmd.js
  self.index = opts.index

  var torrent = new Torrent(torrentId, extend({ client: self }, opts))
  self.torrents.push(torrent)

  function clientOnTorrent (_torrent) {
    if (torrent.infoHash === _torrent.infoHash) {
      ontorrent(torrent)
      self.removeListener('torrent', clientOnTorrent)
    }
  }
  if (ontorrent) self.on('torrent', clientOnTorrent)

  torrent.on('error', function (err) {
    self.emit('error', err, torrent)
  })

  torrent.on('listening', function (port) {
    self.emit('listening', port, torrent)
  })

  torrent.on('ready', function () {
    // Emit 'torrent' when a torrent is ready to be used
    debug('torrent')
    self.emit('torrent', torrent)
    self._onTorrent(torrent)
  })

  return torrent
}

/**
 * Start seeding a new torrent.
 *
 * `input` can be any of the following:
 *   - path to the file or folder on filesystem (string)
 *   - W3C File object (from an `<input>` or drag and drop)
 *   - W3C FileList object (basically an array of `File` objects)
 *   - Array of `File` objects
 *
 * @param  {string|File|FileList|Array.<File>|Blob|Array.<Blob>} input
 * @param  {Object} opts
 * @param  {function} onseed
 */
WebTorrent.prototype.seed = function (input, opts, onseed) {
  var self = this
  if (typeof opts === 'function') {
    onseed = opts
    opts = {}
  }
  // TODO: support `input` as filesystem path string
  var buffer = Buffer.concat(input.map(function (file) {
    return file.buffer
  }))

  var torrent
  function clientOnSeed (_torrent) {
    if (torrent.infoHash === _torrent.infoHash) {
      onseed(torrent)
      self.removeListener('seed', clientOnSeed)
    }
  }
  if (onseed) self.on('seed', clientOnSeed)

  createTorrent(input, opts, function (err, torrentBuf) {
    if (err) return self.emit('error', err)
    var parsedTorrent = parseTorrent(torrentBuf)
    self.add(torrentBuf, opts, function (_torrent) {
      torrent = _torrent
      Storage.writeToStorage(
        torrent.storage,
        buffer,
        parsedTorrent.pieceLength,
        function (err) {
          if (err) return self.emit('error', err)
          self.emit('seed', torrent)
        })
    })
  })
}

/**
 * Remove a torrent from the client.
 *
 * @param  {string|Buffer}   torrentId
 * @param  {function} cb
 */
WebTorrent.prototype.remove = function (torrentId, cb) {
  var self = this
  var torrent = self.get(torrentId)
  if (!torrent) throw new Error('No torrent with id ' + torrentId)
  debug('remove')
  self.torrents.splice(self.torrents.indexOf(torrent), 1)
  torrent.destroy(cb)
}

/**
 * Destroy the client, including all torrents and connections to peers.
 *
 * @override
 * @param  {function} cb
 */
WebTorrent.prototype.destroy = function (cb) {
  var self = this
  debug('destroy')

  var tasks = self.torrents.map(function (torrent) {
    return function (cb) {
      self.remove(torrent.infoHash, cb)
    }
  })

  if (self.dht) tasks.push(function (cb) {
    self.dht.destroy(cb)
  })

  if (self.server) tasks.push(function (cb) {
    try {
      self.server.close(cb)
    } catch (err) {
      // ignore error, server was already closed or not listening
      cb(null)
    }
  })

  parallel(tasks, cb)
}

// TODO: this probably belongs in cmd.js
WebTorrent.prototype._onTorrent = function (torrent) {
  var self = this
  debug('on torrent')

  // if no index specified, use largest file
  if (typeof torrent.index !== 'number') {
    var largestFile = torrent.files.reduce(function (a, b) {
      return a.length > b.length ? a : b
    })
    torrent.index = torrent.files.indexOf(largestFile)
  }

  torrent.files[torrent.index].select()

  // TODO: this won't work with multiple torrents
  self.index = torrent.index
  self.torrent = torrent
}
