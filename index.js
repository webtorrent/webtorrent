module.exports = WebTorrent

var createTorrent = require('create-torrent')
var debug = require('debug')('webtorrent')
var DHT = require('bittorrent-dht/client') // browser exclude
var EventEmitter = require('events').EventEmitter
var extend = require('xtend')
var hat = require('hat')
var inherits = require('inherits')
var loadIPSet = require('load-ip-set') // browser exclude
var parallel = require('run-parallel')
var parseTorrent = require('parse-torrent')
var path = require('path')
var Peer = require('simple-peer')
var speedometer = require('speedometer')
var zeroFill = require('zero-fill')

var concatStream = require('./lib/concat-stream')
var Torrent = require('./lib/torrent')

module.exports.WEBRTC_SUPPORT = Peer.WEBRTC_SUPPORT

/**
 * WebTorrent version.
 */
var VERSION = require('./package.json').version

/**
 * Version number in Azureus-style. Generated from major and minor semver version.
 * For example:
 *   '0.16.1' -> '0016'
 *   '1.2.5' -> '0102'
 */
var VERSION_STR = VERSION.match(/([0-9]+)/g).slice(0, 2).map(zeroFill(2)).join('')

/**
 * Version prefix string (used in peer ID). WebTorrent uses the Azureus-style
 * encoding: '-', two characters for client id ('WW'), four ascii digits for version
 * number, '-', followed by random numbers.
 * For example:
 *   '-WW0102-'...
 */
var VERSION_PREFIX = '-WW' + VERSION_STR + '-'

inherits(WebTorrent, EventEmitter)

/**
 * WebTorrent Client
 * @param {Object=} opts
 */
function WebTorrent (opts) {
  var self = this
  if (!(self instanceof WebTorrent)) return new WebTorrent(opts)
  EventEmitter.call(self)

  if (!opts) opts = {}

  self.destroyed = false
  self.torrentPort = opts.torrentPort || 0
  self.tracker = opts.tracker !== undefined ? opts.tracker : true

  self._rtcConfig = opts.rtcConfig
  self._wrtc = opts.wrtc || global.WRTC // to support `webtorrent-hybrid` package

  self.torrents = []

  self._downloadSpeed = speedometer()
  self._uploadSpeed = speedometer()

  self.maxConns = opts.maxConns

  self.peerId = typeof opts.peerId === 'string'
    ? opts.peerId
    : (opts.peerId || new Buffer(VERSION_PREFIX + hat(48))).toString('hex')
  self.peerIdBuffer = new Buffer(self.peerId, 'hex')

  self.nodeId = typeof opts.nodeId === 'string'
    ? opts.nodeId
    : (opts.nodeId && opts.nodeId.toString('hex')) || hat(160)
  self.nodeIdBuffer = new Buffer(self.nodeId, 'hex')

  if (opts.dht !== false && typeof DHT === 'function' /* browser exclude */) {
    // use a single DHT instance for all torrents, so the routing table can be reused
    self.dht = new DHT(extend({ nodeId: self.nodeId }, opts.dht))
    self.dht.once('error', function (err) {
      self.emit('error', err)
      self.destroy()
    })

    // Ignore warning when there are > 10 torrents in the client
    self.dht.setMaxListeners(0)

    self.dht.listen(opts.dhtPort)
  } else {
    self.dht = false
  }

  debug('new webtorrent (peerId %s, nodeId %s)', self.peerId, self.nodeId)

  if (typeof loadIPSet === 'function') {
    loadIPSet(opts.blocklist, {
      headers: { 'user-agent': 'WebTorrent/' + VERSION + ' (http://webtorrent.io)' }
    }, function (err, ipSet) {
      if (err) return self.error('Failed to load blocklist: ' + err.message)
      self.blocked = ipSet
      ready()
    })
  } else process.nextTick(ready)

  function ready () {
    if (self.destroyed) return
    self.ready = true
    self.emit('ready')
  }
}

Object.defineProperty(WebTorrent.prototype, 'downloadSpeed', {
  get: function () { return this._downloadSpeed() }
})

Object.defineProperty(WebTorrent.prototype, 'uploadSpeed', {
  get: function () { return this._uploadSpeed() }
})

Object.defineProperty(WebTorrent.prototype, 'progress', {
  get: function () {
    var torrents = this.torrents.filter(function (torrent) {
      return torrent.progress !== 1
    })
    var downloaded = torrents.reduce(function (total, torrent) {
      return total + torrent.downloaded
    }, 0)
    var length = torrents.reduce(function (total, torrent) {
      return total + (torrent.length || 0)
    }, 0) || 1
    return downloaded / length
  }
})

Object.defineProperty(WebTorrent.prototype, 'ratio', {
  get: function () {
    var uploaded = this.torrents.reduce(function (total, torrent) {
      return total + torrent.uploaded
    }, 0)
    var downloaded = this.torrents.reduce(function (total, torrent) {
      return total + torrent.downloaded
    }, 0) || 1
    return uploaded / downloaded
  }
})

/**
 * Returns the torrent with the given `torrentId`. Convenience method. Easier than
 * searching through the `client.torrents` array. Returns `null` if no matching torrent
 * found.
 *
 * @param  {string|Buffer|Object|Torrent} torrentId
 * @return {Torrent|null}
 */
WebTorrent.prototype.get = function (torrentId) {
  var self = this
  if (torrentId instanceof Torrent) return torrentId

  var parsed
  try { parsed = parseTorrent(torrentId) } catch (err) {}

  if (!parsed) return null
  if (!parsed.infoHash) throw new Error('Invalid torrent identifier')

  for (var i = 0, len = self.torrents.length; i < len; i++) {
    var torrent = self.torrents[i]
    if (torrent.infoHash === parsed.infoHash) return torrent
  }
  return null
}

/**
 * Start downloading a new torrent. Aliased as `client.download`.
 * @param {string|Buffer|Object} torrentId
 * @param {Object} opts torrent-specific options
 * @param {function=} ontorrent called when the torrent is ready (has metadata)
 */
WebTorrent.prototype.add =
WebTorrent.prototype.download = function (torrentId, opts, ontorrent) {
  var self = this
  if (self.destroyed) throw new Error('client is destroyed')
  if (typeof opts === 'function') return self.add(torrentId, null, opts)

  debug('add')
  opts = opts ? extend(opts) : {}

  var torrent = self.get(torrentId)

  if (torrent) {
    if (torrent.ready) process.nextTick(onReady)
    else torrent.once('ready', onReady)
  } else {
    torrent = new Torrent(torrentId, self, opts)
    self.torrents.push(torrent)

    torrent.once('error', function (err) {
      self.emit('error', err, torrent)
      self.remove(torrent)
    })

    torrent.once('listening', function (port) {
      self.emit('listening', port, torrent)
    })

    torrent.once('ready', onReady)
  }

  function onReady () {
    debug('on torrent')
    if (typeof ontorrent === 'function') ontorrent(torrent)
    self.emit('torrent', torrent)
  }

  return torrent
}

/**
 * Start seeding a new file/folder.
 * @param  {string|File|FileList|Buffer|Array.<string|File|Buffer>} input
 * @param  {Object=} opts
 * @param  {function=} onseed called when torrent is seeding
 */
WebTorrent.prototype.seed = function (input, opts, onseed) {
  var self = this
  if (self.destroyed) throw new Error('client is destroyed')
  if (typeof opts === 'function') return self.seed(input, null, opts)

  debug('seed')
  opts = opts ? extend(opts) : {}

  // When seeding from fs path, initialize store from that path to avoid a copy
  if (typeof input === 'string') opts.path = path.dirname(input)
  if (!opts.createdBy) opts.createdBy = 'WebTorrent/' + VERSION_STR
  if (!self.tracker) opts.announce = []

  var torrent = self.add(null, opts, onTorrent)
  var streams

  if (!Array.isArray(input)) input = [ input ]
  parallel(input.map(function (item) {
    return function (cb) {
      if (isReadable(item)) concatStream(item, cb)
      else cb(null, item)
    }
  }), function (err, input) {
    if (err) return self.emit('error', err, torrent)
    if (self.destroyed) return
    createTorrent.parseInput(input, opts, function (err, files) {
      if (err) return self.emit('error', err, torrent)
      if (self.destroyed) return
      streams = files.map(function (file) { return file.getStream })

      createTorrent(input, opts, function (err, torrentBuf) {
        if (err) return self.emit('error', err, torrent)
        if (self.destroyed) return

        var existingTorrent = self.get(torrentBuf)
        if (existingTorrent) {
          torrent.destroy()
          _onseed(existingTorrent)
        } else {
          torrent._onTorrentId(torrentBuf)
        }
      })
    })
  })

  function onTorrent (torrent) {
    var tasks = [
      function (cb) {
        torrent.load(streams, cb)
      }
    ]
    if (self.dht) {
      tasks.push(function (cb) {
        torrent.once('dhtAnnounce', cb)
      })
    }
    parallel(tasks, function (err) {
      if (self.destroyed) return
      if (err) return self.emit('error', err, torrent)
      _onseed(torrent)
    })
  }

  function _onseed (torrent) {
    debug('on seed')
    if (typeof onseed === 'function') onseed(torrent)
    self.emit('seed', torrent)
  }

  return torrent
}

/**
 * Remove a torrent from the client.
 * @param  {string|Buffer|Torrent}   torrentId
 * @param  {function} cb
 */
WebTorrent.prototype.remove = function (torrentId, cb) {
  var self = this
  debug('remove')

  var torrent = self.get(torrentId)
  if (!torrent) throw new Error('No torrent with id ' + torrentId)

  self.torrents.splice(self.torrents.indexOf(torrent), 1)
  torrent.destroy(cb)
}

WebTorrent.prototype.address = function () {
  var self = this
  return { address: '0.0.0.0', family: 'IPv4', port: self.torrentPort }
}

/**
 * Destroy the client, including all torrents and connections to peers.
 * @param  {function} cb
 */
WebTorrent.prototype.destroy = function (cb) {
  var self = this
  if (self.destroyed) throw new Error('client already destroyed')
  self.destroyed = true
  debug('destroy')

  var tasks = self.torrents.map(function (torrent) {
    return function (cb) { self.remove(torrent, cb) }
  })

  if (self.dht) tasks.push(function (cb) { self.dht.destroy(cb) })

  parallel(tasks, cb)
}

/**
 * Check if `obj` is a node Readable stream
 * @param  {*} obj
 * @return {boolean}
 */
function isReadable (obj) {
  return typeof obj === 'object' && obj != null && typeof obj.pipe === 'function'
}
