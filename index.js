module.exports = WebTorrent

var searchForTorrents = require('search-kat.ph')
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
var speedometer = require('speedometer')
var zeroFill = require('zero-fill')
var path = require('path')

var Torrent = require('./lib/torrent')

inherits(WebTorrent, EventEmitter)

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

/**
 * WebTorrent Client
 * @param {Object} opts
 */
function WebTorrent (opts) {
  var self = this
  if (!(self instanceof WebTorrent)) return new WebTorrent(opts)
  EventEmitter.call(self)

  if (!opts) opts = {}
  if (!debug.enabled) self.setMaxListeners(0)

  self.destroyed = false
  self.torrentPort = opts.torrentPort || 0
  self.tracker = opts.tracker !== undefined ? opts.tracker : true

  self._rtcConfig = opts.rtcConfig
  self._wrtc = opts.wrtc || global.WRTC // to support `webtorrent-hybrid` package

  self.torrents = []

  self.downloadSpeed = speedometer()
  self.uploadSpeed = speedometer()

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
    self.dht.listen(opts.dhtPort)
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
 * Searchs by query and downloads the first torrent that most closely matches with `query`.
 *
 * @param  {string} query
 * @return {Torrent|null}
 */
WebTorrent.prototype.addBySearch = function (query) {
  var self = this
  if (!query || typeof query !== 'string') return self.emit('error', new Error('query is invalid'))
  if (self.destroyed) return self.emit('error', new Error('client is destroyed'))

  searchForTorrents(query).then(function (search_results) {
    if (!search_results) return self.emit('error', new Error('could not find any matching torrents'))

    var queryTorrent = search_results.filter(
      function (r) {
        if (r.torrent || r.magnet) return true
        return false
      }
    )[0]
    if (!queryTorrent) return self.emit('error', new Error('could not find any valid torrents'))

    self.emit('search')
    return self.download(queryTorrent.magnet)
  })
}

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
  if (!parsed.infoHash) return self.emit('error', new Error('Invalid torrent identifier'))

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
  if (self.destroyed) return self.emit('error', new Error('download client is destroyed'))
  if (typeof opts === 'function') return self.add(torrentId, null, opts)
  debug('add')
  if (!opts) opts = {}
  else opts = extend(opts)

  opts.client = self

  var torrent = self.get(torrentId)

  function _ontorrent () {
    if (typeof ontorrent === 'function') ontorrent(torrent)
  }

  if (torrent) {
    if (torrent.ready) process.nextTick(_ontorrent)
    else torrent.on('ready', _ontorrent)
  } else {
    torrent = new Torrent(torrentId, opts)
    self.torrents.push(torrent)

    torrent.on('error', function (err) {
      self.emit('error', err, torrent)
      self.remove(torrent)
    })

    torrent.on('listening', function (port) {
      self.emit('listening', port, torrent)
    })

    torrent.on('paused', function (port) {
      self.emit('paused', port, torrent)
    })

    torrent.on('resume', function (port) {
      self.emit('resume', torrent)
    })

    torrent.on('infoHash', function () {
      self.emit('infoHash', torrent)
    })

    torrent.on('ready', function () {
      _ontorrent()
      self.emit('torrent', torrent)
    })
  }

  return torrent
}

WebTorrent.prototype.pause = function (currentTorrent, cb) {
  var self = this

  if (!(currentTorrent instanceof Torrent)) return self.emit('error', new Error('input for pause() must be a valid torrent'))
  if (self.destroyed) return self.emit('error', new Error('client is destroyed'))

  if (currentTorrent === null) return self.emit('error', new Error('torrent does not exist'))

  currentTorrent.pause(cb)
}

WebTorrent.prototype.resume = function (currentTorrent) {
  var self = this

  if (!(currentTorrent instanceof Torrent)) return self.emit('error', new Error('input for resume() must be a valid torrent'))
  if (self.destroyed) return self.emit('error', new Error('client is destroyed'))
  if (currentTorrent === null) return self.emit('error', new Error('torrent does not exist'))

  currentTorrent.resume()
}

/**
 * Start seeding a new file/folder.
 * @param  {string|File|FileList|Buffer|Array.<string|File|Buffer>} input
 * @param  {Object=} opts
 * @param  {function=} onseed
 */
WebTorrent.prototype.seed = function (input, opts, onseed) {
  var self = this
  if (self.destroyed) return self.emit('error', new Error('seed client is destroyed'))
  if (typeof opts === 'function') return self.seed(input, null, opts)
  debug('seed')
  if (!opts) opts = {}
  else opts = extend(opts)

  // When seeding from filesystem, initialize store from that path (avoids a copy)
  if (typeof input === 'string') opts.path = path.dirname(input)
  if (!opts.createdBy) opts.createdBy = 'WebTorrent/' + VERSION

  var streams
  var torrent = self.add(undefined, opts, function (torrent) {
    var tasks = [
      function (cb) {
        torrent.load(streams, cb)
      }
    ]
    if (self.dht) {
      tasks.push(function (cb) {
        torrent.on('dhtAnnounce', cb)
      })
    }
    parallel(tasks, function (err) {
      if (err) return self.emit('error', err)
      _onseed()
      self.emit('seed', torrent)
    })
  })

  createTorrent.parseInput(input, opts, function (err, files) {
    if (err) return self.emit('error', err)
    streams = files.map(function (file) { return file.getStream })

    createTorrent(input, opts, function (err, torrentBuf) {
      if (err) return self.emit('error', err)
      if (self.destroyed) return

      var existingTorrent = self.get(torrentBuf)
      if (existingTorrent) {
        torrent.destroy()
        _onseed()
        return
      } else {
        torrent._onTorrentId(torrentBuf)
      }
    })
  })

  function _onseed () {
    debug('on seed')
    if (typeof onseed === 'function') onseed(torrent)
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
  if (!torrent) return self.emit('error', new Error('No torrent with id ' + torrentId))

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
  if (self.destroyed) return self.emit('error', new Error('client already destroyed'))
  self.destroyed = true
  debug('destroy')

  var tasks = self.torrents.map(function (torrent) {
    return function (cb) { self.remove(torrent, cb) }
  })

  if (self.dht) tasks.push(function (cb) { self.dht.destroy(cb) })

  parallel(tasks, cb)
}
