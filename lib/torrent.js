/* global URL, Blob */

module.exports = Torrent

var addrToIPPort = require('addr-to-ip-port') // browser exclude
var BitField = require('bitfield')
var ChunkStoreWriteStream = require('chunk-store-stream/write')
var cpus = require('cpus')
var createTorrent = require('create-torrent')
var debug = require('debug')('webtorrent:torrent')
var Discovery = require('torrent-discovery')
var EventEmitter = require('events').EventEmitter
var extendMutable = require('xtend/mutable')
var FSChunkStore = require('fs-chunk-store') // browser: `memory-chunk-store`
var ImmediateChunkStore = require('immediate-chunk-store')
var inherits = require('inherits')
var MultiStream = require('multistream')
var os = require('os') // browser exclude
var parallel = require('run-parallel')
var parallelLimit = require('run-parallel-limit')
var parseTorrent = require('parse-torrent')
var path = require('path')
var pathExists = require('path-exists') // browser exclude
var Piece = require('torrent-piece')
var pump = require('pump')
var randomIterate = require('random-iterate')
var reemit = require('re-emitter')
var sha1 = require('simple-sha1')
var Swarm = require('bittorrent-swarm')
var uniq = require('uniq')
var ut_metadata = require('ut_metadata')
var ut_pex = require('ut_pex') // browser exclude

var File = require('./file')
var RarityMap = require('./rarity-map')
var Server = require('./server') // browser exclude

var MAX_BLOCK_LENGTH = 128 * 1024
var PIECE_TIMEOUT = 30000
var CHOKE_TIMEOUT = 5000
var SPEED_THRESHOLD = 3 * Piece.BLOCK_LENGTH

var PIPELINE_MIN_DURATION = 0.5
var PIPELINE_MAX_DURATION = 1

var RECHOKE_INTERVAL = 10000 // 10 seconds
var RECHOKE_OPTIMISTIC_DURATION = 2 // 30 seconds

var TMP = typeof pathExists.sync === 'function'
  ? path.join(pathExists.sync('/tmp') ? '/tmp' : os.tmpDir(), 'webtorrent')
  : '/tmp/webtorrent'

inherits(Torrent, EventEmitter)

/**
 * @param {string|Buffer|Object} torrentId
 * @param {Object=} opts
 */
function Torrent (torrentId, opts) {
  EventEmitter.call(this)
  if (!debug.enabled) this.setMaxListeners(0)
  debug('new torrent')

  this.client = opts.client

  this.announce = opts.announce
  this.urlList = opts.urlList

  this.path = opts.path
  this._store = opts.store || FSChunkStore

  this.strategy = opts.strategy || 'sequential'

  this._rechokeNumSlots = (opts.uploads === false || opts.uploads === 0)
    ? 0
    : (+opts.uploads || 10)
  this._rechokeOptimisticWire = null
  this._rechokeOptimisticTime = 0
  this._rechokeIntervalId = null

  this.ready = false
  this.destroyed = false
  this.metadata = null
  this.store = null
  this.numBlockedPeers = 0
  this.files = null
  this.done = false

  this._amInterested = false
  this.pieces = []
  this._selections = []
  this._critical = []

  // for cleanup
  this._servers = []

  if (torrentId != null) this._onTorrentId(torrentId)
}

// Time remaining in milliseconds
Object.defineProperty(Torrent.prototype, 'timeRemaining', {
  get: function () {
    if (this.done) return 0
    if (!this.swarm || this.swarm.downloadSpeed() === 0) return Infinity
    return ((this.length - this.downloaded) / this.swarm.downloadSpeed()) * 1000
  }
})

// Bytes completed, excluding invalid data
Object.defineProperty(Torrent.prototype, 'downloaded', {
  get: function () {
    if (!this.bitfield) return 0
    var downloaded = 0
    for (var index = 0, len = this.pieces.length; index < len; ++index) {
      if (this.bitfield.get(index)) { // verified data
        downloaded += (index === len - 1) ? this.lastPieceLength : this.pieceLength
      } else { // "in progress" data
        var piece = this.pieces[index]
        downloaded += (piece.length - piece.missing)
      }
    }
    return downloaded
  }
})

// Bytes received from peers, including invalid data
Object.defineProperty(Torrent.prototype, 'received', {
  get: function () { return this.swarm ? this.swarm.downloaded : 0 }
})

// Bytes uploaded
Object.defineProperty(Torrent.prototype, 'uploaded', {
  get: function () { return this.swarm ? this.swarm.uploaded : 0 }
})

// The number of missing pieces. Used to implement 'end game' mode.
// Object.defineProperty(Storage.prototype, 'numMissing', {
//   get: function () {
//     var self = this
//     var numMissing = self.pieces.length
//     for (var index = 0, len = self.pieces.length; index < len; index++) {
//       numMissing -= self.bitfield.get(index)
//     }
//     return numMissing
//   }
// })

// Percentage complete, represented as a number between 0 and 1
Object.defineProperty(Torrent.prototype, 'progress', {
  get: function () { return this.length ? this.downloaded / this.length : 0 }
})

// Seed ratio (uploaded / downloaded)
Object.defineProperty(Torrent.prototype, 'ratio', {
  get: function () { return this.uploaded / (this.downloaded || 1) }
})

// Download speed in bytes/sec
Object.defineProperty(Torrent.prototype, 'downloadSpeed', {
  get: function () { return this.swarm ? this.swarm.downloadSpeed() : 0 }
})

// Upload speed in bytes/sec
Object.defineProperty(Torrent.prototype, 'uploadSpeed', {
  get: function () { return this.swarm ? this.swarm.uploadSpeed() : 0 }
})

// Number of peers
Object.defineProperty(Torrent.prototype, 'numPeers', {
  get: function () { return this.swarm ? this.swarm.numPeers : 0 }
})

// Torrent file as a blob url
Object.defineProperty(Torrent.prototype, 'torrentFileBlobURL', {
  get: function () {
    if (typeof window === 'undefined') throw new Error('browser-only property')
    if (!this.torrentFile) return null
    return URL.createObjectURL(
      new Blob([ this.torrentFile ], { type: 'application/x-bittorrent' })
    )
  }
})

Torrent.prototype._onTorrentId = function (torrentId) {
  var self = this
  if (self.destroyed) return
  parseTorrent.remote(torrentId, function (err, parsedTorrent) {
    if (self.destroyed) return
    if (err) return self._onError(err)
    self._onParsedTorrent(parsedTorrent)
  })
}

Torrent.prototype._onParsedTorrent = function (parsedTorrent) {
  var self = this
  if (self.destroyed) return

  self._processParsedTorrent(parsedTorrent)

  if (!self.infoHash) {
    return self._onError(new Error('Malformed torrent data: No info hash'))
  }

  if (!self.path) self.path = path.join(TMP, self.infoHash)

  // create swarm
  self.swarm = new Swarm(self.infoHash, self.client.peerId, {
    handshake: {
      dht: self.private ? false : !!self.client.dht
    },
    maxConns: self.client.maxConns
  })
  self.swarm.on('error', self._onError.bind(self))
  self.swarm.on('wire', self._onWire.bind(self))

  self.swarm.on('download', function (downloaded) {
    self.client._downloadSpeed(downloaded) // update overall client stats
    self.client.emit('download', downloaded)
    self.emit('download', downloaded)
  })

  self.swarm.on('upload', function (uploaded) {
    self.client._uploadSpeed(uploaded) // update overall client stats
    self.client.emit('upload', uploaded)
    self.emit('upload', uploaded)
  })

  // listen for peers (note: in the browser, this is a no-op and callback is called on
  // next tick)
  self.swarm.listen(self.client.torrentPort, self._onSwarmListening.bind(self))

  self.emit('infoHash', self.infoHash)
}

Torrent.prototype._processParsedTorrent = function (parsedTorrent) {
  if (this.announce) {
    // Allow specifying trackers via `opts` parameter
    parsedTorrent.announce = parsedTorrent.announce.concat(this.announce)
  }

  if (this.client.tracker && global.WEBTORRENT_ANNOUNCE) {
    // So `webtorrent-hybrid` can force specific trackers to be used
    parsedTorrent.announce = parsedTorrent.announce.concat(global.WEBTORRENT_ANNOUNCE)
  }

  if (this.client.tracker && parsedTorrent.announce.length === 0) {
    // When no trackers specified, use some reasonable defaults
    parsedTorrent.announce = createTorrent.announceList.map(function (list) {
      return list[0]
    })
  }

  if (this.urlList) {
    // Allow specifying web seeds via `opts` parameter
    parsedTorrent.urlList = parsedTorrent.urlList.concat(this.urlList)
  }

  uniq(parsedTorrent.announce)
  uniq(parsedTorrent.urlList)

  extendMutable(this, parsedTorrent)

  this.magnetURI = parseTorrent.toMagnetURI(parsedTorrent)
  this.torrentFile = parseTorrent.toTorrentFile(parsedTorrent)
}

Torrent.prototype._onSwarmListening = function () {
  var self = this
  if (self.destroyed) return

  if (self.swarm.server) self.client.torrentPort = self.swarm.address().port

  // begin discovering peers via the DHT and tracker servers
  self.discovery = new Discovery({
    announce: self.announce,
    dht: self.private
      ? false
      : self.client.dht,
    tracker: self.client.tracker,
    peerId: self.client.peerId,
    port: self.client.torrentPort,
    rtcConfig: self.client._rtcConfig,
    wrtc: self.client._wrtc
  })
  self.discovery.on('error', self._onError.bind(self))
  self.discovery.on('peer', self.addPeer.bind(self))

  // expose discovery events
  reemit(self.discovery, self, ['trackerAnnounce', 'dhtAnnounce', 'warning'])

  // if full metadata was included in initial torrent id, use it
  if (self.info) self._onMetadata(self)
  else self.discovery.setTorrent(self.infoHash)

  self.emit('listening', self.client.torrentPort)
}

/**
 * Called when the full torrent metadata is received.
 */
Torrent.prototype._onMetadata = function (metadata) {
  var self = this
  if (self.metadata || self.destroyed) return
  debug('got metadata')

  var parsedTorrent
  if (metadata && metadata.infoHash) {
    // `metadata` is a parsed torrent (from parse-torrent module)
    parsedTorrent = metadata
  } else {
    try {
      parsedTorrent = parseTorrent(metadata)
    } catch (err) {
      return self._onError(err)
    }
  }

  self._processParsedTorrent(parsedTorrent)
  self.metadata = self.torrentFile

  // pass full torrent metadata to discovery module
  self.discovery.setTorrent(self)

  // add web seed urls (BEP19)
  if (self.urlList) self.urlList.forEach(self.addWebSeed.bind(self))

  self.rarityMap = new RarityMap(self.swarm, self.pieces.length)

  self.store = new ImmediateChunkStore(
    new self._store(self.pieceLength, {
      files: self.files.map(function (file) {
        return {
          path: path.join(self.path, file.path),
          length: file.length,
          offset: file.offset
        }
      }),
      length: self.length
    })
  )

  self.files = self.files.map(function (file) {
    return new File(self, file)
  })

  self._hashes = self.pieces

  self.pieces = self.pieces.map(function (hash, i) {
    var pieceLength = (i === self.pieces.length - 1)
      ? self.lastPieceLength
      : self.pieceLength
    return new Piece(pieceLength)
  })

  self._reservations = self.pieces.map(function () {
    return []
  })

  self.bitfield = new BitField(self.pieces.length)

  self.swarm.wires.forEach(function (wire) {
    // If we didn't have the metadata at the time ut_metadata was initialized for this
    // wire, we still want to make it available to the peer in case they request it.
    if (wire.ut_metadata) wire.ut_metadata.setMetadata(self.metadata)

    self._onWireWithMetadata(wire)
  })

  debug('verifying existing torrent data')
  parallelLimit(self.pieces.map(function (piece, index) {
    return function (cb) {
      self.store.get(index, function (err, buf) {
        if (err) return cb(null) // ignore error
        sha1(buf, function (hash) {
          if (hash === self._hashes[index]) {
            if (!self.pieces[index]) return
            debug('piece verified %s', index)
            self.pieces[index] = null
            self._reservations[index] = null
            self.bitfield.set(index, true)
          } else {
            debug('piece invalid %s', index)
          }
          cb(null)
        })
      })
    }
  }), cpus().length, function (err) {
    if (err) return self._onError(err)
    debug('done verifying')
    self._onStore()
  })

  self.emit('metadata')
}

/**
 * Called when the metadata, swarm, and underlying chunk store is initialized.
 */
Torrent.prototype._onStore = function () {
  var self = this
  if (self.destroyed) return
  debug('on store')

  // start off selecting the entire torrent with low priority
  self.select(0, self.pieces.length - 1, false)

  self._rechokeIntervalId = setInterval(self._rechoke.bind(self), RECHOKE_INTERVAL)
  if (self._rechokeIntervalId.unref) self._rechokeIntervalId.unref()

  self.ready = true
  self.emit('ready')

  self._checkDone()
}

/**
 * Destroy and cleanup this torrent.
 */
Torrent.prototype.destroy = function (cb) {
  var self = this
  if (self.destroyed) return
  self.destroyed = true
  debug('destroy')

  self.client.remove(self)

  if (self._rechokeIntervalId) {
    clearInterval(self._rechokeIntervalId)
    self._rechokeIntervalId = null
  }

  var tasks = []

  self._servers.forEach(function (server) {
    tasks.push(function (cb) { server.destroy(cb) })
  })

  if (self.swarm) tasks.push(function (cb) { self.swarm.destroy(cb) })
  if (self.discovery) tasks.push(function (cb) { self.discovery.stop(cb) })
  if (self.store) tasks.push(function (cb) { self.store.close(cb) })

  parallel(tasks, cb)
}

/**
 * Add a peer to the swarm
 * @param {string|SimplePeer} peer
 * @return {boolean} true if peer was added, false if peer was blocked
 */
Torrent.prototype.addPeer = function (peer) {
  var self = this
  if (self.destroyed) throw new Error('torrent is destroyed')

  function addPeer () {
    self.swarm.addPeer(peer)
    self.emit('peer', peer)
  }

  if (self.client.blocked) {
    var addr = typeof peer === 'string' ? peer : peer.remoteAddress

    if (addr && self.client.blocked.contains(addrToIPPort(addr)[0])) {
      self.numBlockedPeers += 1
      self.emit('blockedPeer', peer)
      return false
    }
  }

  if (self.swarm) addPeer()
  else self.once('listening', addPeer)
  return true
}

/**
 * Add a web seed to the swarm
 * @param {string} url web seed url
 */
Torrent.prototype.addWebSeed = function (url) {
  if (this.destroyed) throw new Error('torrent is destroyed')
  debug('add web seed %s', url)
  this.swarm.addWebSeed(url, this)
}

/**
 * Select a range of pieces to prioritize.
 *
 * @param {number}    start     start piece index (inclusive)
 * @param {number}    end       end piece index (inclusive)
 * @param {number}    priority  priority associated with this selection
 * @param {function}  notify    callback when selection is updated with new data
 */
Torrent.prototype.select = function (start, end, priority, notify) {
  var self = this
  if (self.destroyed) throw new Error('torrent is destroyed')

  if (start > end || start < 0 || end >= self.pieces.length) {
    throw new Error('invalid selection ', start, ':', end)
  }
  priority = Number(priority) || 0

  debug('select %s-%s (priority %s)', start, end, priority)

  self._selections.push({
    from: start,
    to: end,
    offset: 0,
    priority: priority,
    notify: notify || noop
  })

  self._selections.sort(function (a, b) {
    return b.priority - a.priority
  })

  self._updateSelections()
}

/**
 * Deprioritizes a range of previously selected pieces.
 *
 * @param {number}  start     start piece index (inclusive)
 * @param {number}  end       end piece index (inclusive)
 * @param {number}  priority  priority associated with the selection
 */
Torrent.prototype.deselect = function (start, end, priority) {
  var self = this
  if (self.destroyed) throw new Error('torrent is destroyed')

  priority = Number(priority) || 0
  debug('deselect %s-%s (priority %s)', start, end, priority)

  for (var i = 0; i < self._selections.length; ++i) {
    var s = self._selections[i]
    if (s.from === start && s.to === end && s.priority === priority) {
      self._selections.splice(i--, 1)
      break
    }
  }

  self._updateSelections()
}

/**
 * Marks a range of pieces as critical priority to be downloaded ASAP.
 *
 * @param {number}  start  start piece index (inclusive)
 * @param {number}  end    end piece index (inclusive)
 */
Torrent.prototype.critical = function (start, end) {
  var self = this
  if (self.destroyed) throw new Error('torrent is destroyed')

  debug('critical %s-%s', start, end)

  for (var i = start; i <= end; ++i) {
    self._critical[i] = true
  }

  self._updateSelections()
}

Torrent.prototype._onWire = function (wire, addr) {
  var self = this
  debug('got wire (%s)', addr || 'Unknown')

  if (addr) {
    // Sometimes RTCPeerConnection.getStats() doesn't return an ip:port for peers
    var parts = addrToIPPort(addr)
    wire.remoteAddress = parts[0]
    wire.remotePort = parts[1]
  }

  // If peer supports DHT, send PORT message to report DHT listening port
  if (wire.peerExtensions.dht && self.client.dht && self.client.dht.listening) {
    // When peer sends PORT, add them to the routing table
    wire.on('port', function (port) {
      if (!wire.remoteAddress) return debug('ignoring PORT from peer with no address')
      if (port === 0 || port > 65536) return debug('ignoring invalid PORT from peer')

      debug('port: %s (from %s)', port, wire.remoteAddress + ':' + wire.remotePort)
      self.client.dht.addNode({ host: wire.remoteAddress, port: port })
    })

    wire.port(self.client.dht.address().port)
  }

  wire.on('timeout', function () {
    debug('wire timeout (%s)', addr)
    // TODO: this might be destroying wires too eagerly
    wire.destroy()
  })

  // Timeout for piece requests to this peer
  wire.setTimeout(PIECE_TIMEOUT, true)

  // Send KEEP-ALIVE (every 60s) so peers will not disconnect the wire
  wire.setKeepAlive(true)

  // use ut_metadata extension
  wire.use(ut_metadata(self.metadata))

  wire.ut_metadata.on('warning', function (err) {
    debug('ut_metadata warning: %s', err.message)
  })

  if (!self.metadata) {
    wire.ut_metadata.on('metadata', function (metadata) {
      debug('got metadata via ut_metadata')
      self._onMetadata(metadata)
    })
    wire.ut_metadata.fetch()
  }

  // use ut_pex extension if the torrent is not flagged as private
  if (typeof ut_pex === 'function' && !self.private) {
    wire.use(ut_pex())

    wire.ut_pex.on('peer', function (peer) {
      debug('ut_pex: got peer: %s (from %s)', peer, addr)
      self.addPeer(peer)
    })

    wire.ut_pex.on('dropped', function (peer) {
      // the remote peer believes a given peer has been dropped from the swarm.
      // if we're not currently connected to it, then remove it from the swarm's queue.
      var peerObj = self.swarm._peers[peer]
      if (peerObj && !peerObj.connected) {
        debug('ut_pex: dropped peer: %s (from %s)', peer, addr)
        self.swarm.removePeer(peer)
      }
    })
  }

  // Hook to allow user-defined `bittorrent-protocol extensions
  // More info: https://github.com/feross/bittorrent-protocol#extension-api
  self.emit('wire', wire, addr)

  if (self.metadata) {
    self._onWireWithMetadata(wire)
  }
}

Torrent.prototype._onWireWithMetadata = function (wire) {
  var self = this
  var timeoutId = null

  function onChokeTimeout () {
    if (self.destroyed || wire.destroyed) return

    if (self.swarm.numQueued > 2 * (self.swarm.numConns - self.swarm.numPeers) &&
      wire.amInterested) {
      wire.destroy()
    } else {
      timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
      if (timeoutId.unref) timeoutId.unref()
    }
  }

  var i = 0
  function updateSeedStatus () {
    if (wire.peerPieces.length !== self.pieces.length) return
    for (; i < self.pieces.length; ++i) {
      if (!wire.peerPieces.get(i)) return
    }
    wire.isSeeder = true
    wire.choke() // always choke seeders
  }

  wire.on('bitfield', function () {
    updateSeedStatus()
    self._update()
  })

  wire.on('have', function () {
    updateSeedStatus()
    self._update()
  })

  wire.once('interested', function () {
    wire.unchoke()
  })

  wire.on('close', function () {
    clearTimeout(timeoutId)
  })

  wire.on('choke', function () {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
    if (timeoutId.unref) timeoutId.unref()
  })

  wire.on('unchoke', function () {
    clearTimeout(timeoutId)
    self._update()
  })

  wire.on('request', function (index, offset, length, cb) {
    if (length > MAX_BLOCK_LENGTH) {
      // Per spec, disconnect from peers that request >128KB
      return wire.destroy()
    }
    if (self.pieces[index]) return
    self.store.get(index, { offset: offset, length: length }, cb)
  })

  wire.bitfield(self.bitfield) // always send bitfield (required)
  wire.interested() // always start out interested

  timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
  if (timeoutId.unref) timeoutId.unref()

  wire.isSeeder = false
  updateSeedStatus()
}

/**
 * Called on selection changes.
 */
Torrent.prototype._updateSelections = function () {
  var self = this
  if (!self.swarm || self.destroyed) return
  if (!self.metadata) return self.once('metadata', self._updateSelections.bind(self))

  process.nextTick(self._gcSelections.bind(self))
  self._updateInterest()
  self._update()
}

/**
 * Garbage collect selections with respect to the store's current state.
 */
Torrent.prototype._gcSelections = function () {
  var self = this

  for (var i = 0; i < self._selections.length; i++) {
    var s = self._selections[i]
    var oldOffset = s.offset

    // check for newly downloaded pieces in selection
    while (self.bitfield.get(s.from + s.offset) && s.from + s.offset < s.to) {
      s.offset++
    }

    if (oldOffset !== s.offset) s.notify()
    if (s.to !== s.from + s.offset) continue
    if (!self.bitfield.get(s.from + s.offset)) continue

    // remove fully downloaded selection
    self._selections.splice(i--, 1) // decrement i to offset splice
    s.notify() // TODO: this may notify twice in a row. is this a problem?
    self._updateInterest()
  }

  if (!self._selections.length) self.emit('idle')
}

/**
 * Update interested status for all peers.
 */
Torrent.prototype._updateInterest = function () {
  var self = this

  var prev = self._amInterested
  self._amInterested = !!self._selections.length

  self.swarm.wires.forEach(function (wire) {
    // TODO: only call wire.interested if the wire has at least one piece we need
    if (self._amInterested) wire.interested()
    else wire.uninterested()
  })

  if (prev === self._amInterested) return
  if (self._amInterested) self.emit('interested')
  else self.emit('uninterested')
}

/**
 * Heartbeat to update all peers and their requests.
 */
Torrent.prototype._update = function () {
  var self = this
  if (self.destroyed) return

  // update wires in random order for better request distribution
  var ite = randomIterate(self.swarm.wires)
  var wire
  while ((wire = ite())) {
    self._updateWire(wire)
  }
}

/**
 * Attempts to update a peer's requests
 */
Torrent.prototype._updateWire = function (wire) {
  var self = this

  if (wire.peerChoking) return
  if (!wire.downloaded) return validateWire()

  var minOutstandingRequests = getPipelineLength(wire, PIPELINE_MIN_DURATION)
  if (wire.requests.length >= minOutstandingRequests) return
  var maxOutstandingRequests = getPipelineLength(wire, PIPELINE_MAX_DURATION)

  trySelectWire(false) || trySelectWire(true)

  function genPieceFilterFunc (start, end, tried, rank) {
    return function (i) {
      return i >= start && i <= end && !(i in tried) && wire.peerPieces.get(i) && (!rank || rank(i))
    }
  }

  // TODO: Do we need both validateWire and trySelectWire?
  function validateWire () {
    if (wire.requests.length) return

    var i = self._selections.length
    while (i--) {
      var next = self._selections[i]
      var piece
      if (self.strategy === 'rarest') {
        var start = next.from + next.offset
        var end = next.to
        var len = end - start + 1
        var tried = {}
        var tries = 0
        var filter = genPieceFilterFunc(start, end, tried)

        while (tries < len) {
          piece = self.rarityMap.getRarestPiece(filter)
          if (piece < 0) break
          if (self._request(wire, piece, false)) return
          tried[piece] = true
          tries += 1
        }
      } else {
        for (piece = next.to; piece >= next.from + next.offset; --piece) {
          if (!wire.peerPieces.get(piece)) continue
          if (self._request(wire, piece, false)) return
        }
      }
    }

    // TODO: wire failed to validate as useful; should we close it?
    // probably not, since 'have' and 'bitfield' messages might be coming
  }

  function speedRanker () {
    var speed = wire.downloadSpeed() || 1
    if (speed > SPEED_THRESHOLD) return function () { return true }

    var secs = Math.max(1, wire.requests.length) * Piece.BLOCK_LENGTH / speed
    var tries = 10
    var ptr = 0

    return function (index) {
      if (!tries || self.bitfield.get(index)) return true

      var missing = self.pieces[index].missing

      for (; ptr < self.swarm.wires.length; ptr++) {
        var otherWire = self.swarm.wires[ptr]
        var otherSpeed = otherWire.downloadSpeed()

        if (otherSpeed < SPEED_THRESHOLD) continue
        if (otherSpeed <= speed) continue
        if (!otherWire.peerPieces.get(index)) continue
        if ((missing -= otherSpeed * secs) > 0) continue

        tries--
        return false
      }

      return true
    }
  }

  function shufflePriority (i) {
    var last = i
    for (var j = i; j < self._selections.length && self._selections[j].priority; j++) {
      last = j
    }
    var tmp = self._selections[i]
    self._selections[i] = self._selections[last]
    self._selections[last] = tmp
  }

  function trySelectWire (hotswap) {
    if (wire.requests.length >= maxOutstandingRequests) return true
    var rank = speedRanker()

    for (var i = 0; i < self._selections.length; i++) {
      var next = self._selections[i]

      var piece
      if (self.strategy === 'rarest') {
        var start = next.from + next.offset
        var end = next.to
        var len = end - start + 1
        var tried = {}
        var tries = 0
        var filter = genPieceFilterFunc(start, end, tried, rank)

        while (tries < len) {
          piece = self.rarityMap.getRarestPiece(filter)
          if (piece < 0) break

          // request all non-reserved blocks in this piece
          while (self._request(wire, piece, self._critical[piece] || hotswap)) {}

          if (wire.requests.length < maxOutstandingRequests) {
            tried[piece] = true
            tries++
            continue
          }

          if (next.priority) shufflePriority(i)
          return true
        }
      } else {
        for (piece = next.from + next.offset; piece <= next.to; piece++) {
          if (!wire.peerPieces.get(piece) || !rank(piece)) continue

          // request all non-reserved blocks in piece
          while (self._request(wire, piece, self._critical[piece] || hotswap)) {}

          if (wire.requests.length < maxOutstandingRequests) continue

          if (next.priority) shufflePriority(i)
          return true
        }
      }
    }

    return false
  }
}

/**
 * Called periodically to update the choked status of all peers, handling optimistic
 * unchoking as described in BEP3.
 */
Torrent.prototype._rechoke = function () {
  var self = this

  if (self._rechokeOptimisticTime > 0) self._rechokeOptimisticTime -= 1
  else self._rechokeOptimisticWire = null

  var peers = []

  self.swarm.wires.forEach(function (wire) {
    if (!wire.isSeeder && wire !== self._rechokeOptimisticWire) {
      peers.push({
        wire: wire,
        downloadSpeed: wire.downloadSpeed(),
        uploadSpeed: wire.uploadSpeed(),
        salt: Math.random(),
        isChoked: true
      })
    }
  })

  peers.sort(rechokeSort)

  var unchokeInterested = 0
  var i = 0
  for (; i < peers.length && unchokeInterested < self._rechokeNumSlots; ++i) {
    peers[i].isChoked = false
    if (peers[i].wire.peerInterested) unchokeInterested += 1
  }

  // Optimistically unchoke a peer
  if (!self._rechokeOptimisticWire && i < peers.length && self._rechokeNumSlots) {
    var candidates = peers.slice(i).filter(function (peer) { return peer.wire.peerInterested })
    var optimistic = candidates[randomInt(candidates.length)]

    if (optimistic) {
      optimistic.isChoked = false
      self._rechokeOptimisticWire = optimistic.wire
      self._rechokeOptimisticTime = RECHOKE_OPTIMISTIC_DURATION
    }
  }

  // Unchoke best peers
  peers.forEach(function (peer) {
    if (peer.wire.amChoking !== peer.isChoked) {
      if (peer.isChoked) peer.wire.choke()
      else peer.wire.unchoke()
    }
  })

  function rechokeSort (peerA, peerB) {
    // Prefer higher download speed
    if (peerA.downloadSpeed !== peerB.downloadSpeed) {
      return peerB.downloadSpeed - peerA.downloadSpeed
    }

    // Prefer higher upload speed
    if (peerA.uploadSpeed !== peerB.uploadSpeed) {
      return peerB.uploadSpeed - peerA.uploadSpeed
    }

    // Prefer unchoked
    if (peerA.wire.amChoking !== peerB.wire.amChoking) {
      return peerA.wire.amChoking ? 1 : -1
    }

    // Random order
    return peerA.salt - peerB.salt
  }
}

/**
 * Attempts to cancel a slow block request from another wire such that the
 * given wire may effectively swap out the request for one of its own.
 */
Torrent.prototype._hotswap = function (wire, index) {
  var self = this

  var speed = wire.downloadSpeed()
  if (speed < Piece.BLOCK_LENGTH) return false
  if (!self._reservations[index]) return false

  var r = self._reservations[index]
  if (!r) {
    return false
  }

  var minSpeed = Infinity
  var minWire

  var i
  for (i = 0; i < r.length; i++) {
    var otherWire = r[i]
    if (!otherWire || otherWire === wire) continue

    var otherSpeed = otherWire.downloadSpeed()
    if (otherSpeed >= SPEED_THRESHOLD) continue
    if (2 * otherSpeed > speed || otherSpeed > minSpeed) continue

    minWire = otherWire
    minSpeed = otherSpeed
  }

  if (!minWire) return false

  for (i = 0; i < r.length; i++) {
    if (r[i] === minWire) r[i] = null
  }

  for (i = 0; i < minWire.requests.length; i++) {
    var req = minWire.requests[i]
    if (req.piece !== index) continue

    self.pieces[index].cancel((req.offset / Piece.BLOCK_SIZE) | 0)
  }

  self.emit('hotswap', minWire, wire, index)
  return true
}

/**
 * Attempts to request a block from the given wire.
 */
Torrent.prototype._request = function (wire, index, hotswap) {
  var self = this
  var numRequests = wire.requests.length

  if (self.bitfield.get(index)) return false

  var maxOutstandingRequests = getPipelineLength(wire, PIPELINE_MAX_DURATION)
  if (numRequests >= maxOutstandingRequests) return false
  // var endGame = (wire.requests.length === 0 && self.store.numMissing < 30)

  var piece = self.pieces[index]
  var reservation = piece.reserve()

  if (reservation === -1 && hotswap && self._hotswap(wire, index)) {
    reservation = piece.reserve()
  }
  if (reservation === -1) return false

  var r = self._reservations[index]
  if (!r) r = self._reservations[index] = []
  var i = r.indexOf(null)
  if (i === -1) i = r.length
  r[i] = wire

  var chunkOffset = piece.chunkOffset(reservation)
  var chunkLength = piece.chunkLength(reservation)

  wire.request(index, chunkOffset, chunkLength, function onChunk (err, chunk) {
    // TODO: what is this for?
    if (!self.ready) return self.once('ready', function () { onChunk(err, chunk) })

    if (r[i] === wire) r[i] = null

    if (piece !== self.pieces[index]) return onUpdateTick()

    if (err) {
      debug(
        'error getting piece %s (offset: %s length: %s) from %s: %s',
        index, chunkOffset, chunkLength, wire.remoteAddress + ':' + wire.remotePort,
        err.message
      )
      piece.cancel(reservation)
      onUpdateTick()
      return
    }

    debug(
      'got piece %s (offset: %s length: %s) from %s',
      index, chunkOffset, chunkLength, wire.remoteAddress + ':' + wire.remotePort
    )

    if (!piece.set(reservation, chunk, wire)) return onUpdateTick()

    var buf = piece.flush()

    // TODO: might need to set self.pieces[index] = null here since sha1 is async

    sha1(buf, function (hash) {
      if (hash === self._hashes[index]) {
        if (!self.pieces[index]) return
        debug('piece verified %s', index)

        self.pieces[index] = null
        self._reservations[index] = null
        self.bitfield.set(index, true)

        self.store.put(index, buf)

        self.swarm.wires.forEach(function (wire) {
          wire.have(index)
        })

        self._checkDone()
      } else {
        self.pieces[index] = new Piece(piece.length)
        self.emit('warning', new Error('Piece ' + index + ' failed verification'))
      }
      onUpdateTick()
    })
  })

  function onUpdateTick () {
    process.nextTick(function () { self._update() })
  }

  return true
}

Torrent.prototype._checkDone = function () {
  var self = this
  if (self.destroyed) return

  // are any new files done?
  self.files.forEach(function (file) {
    if (file.done) return
    for (var i = file._startPiece; i <= file._endPiece; ++i) {
      if (!self.bitfield.get(i)) return
    }
    file.done = true
    file.emit('done')
    debug('file done: ' + file.name)
  })

  // is the torrent done? (if all current selections are satisfied, or there are
  // no selections, then torrent is done)
  var done = true
  for (var i = 0; i < self._selections.length; i++) {
    var selection = self._selections[i]
    for (var piece = selection.from; piece <= selection.to; piece++) {
      if (!self.bitfield.get(piece)) {
        done = false
        break
      }
    }
    if (!done) break
  }
  if (!self.done && done) {
    self.done = true
    self.emit('done')
    debug('torrent done: ' + self.infoHash)
    if (self.discovery.tracker) self.discovery.tracker.complete()
  }

  self._gcSelections()
}

Torrent.prototype.load = function (streams, cb) {
  var self = this
  if (self.destroyed) throw new Error('torrent is destroyed')
  if (!self.ready) return self.once('ready', function () { self.load(streams, cb) })

  if (!Array.isArray(streams)) streams = [ streams ]
  if (!cb) cb = noop

  var readable = new MultiStream(streams)
  var writable = new ChunkStoreWriteStream(self.store, self.pieceLength)

  pump(readable, writable, function (err) {
    if (err) return cb(err)
    self.pieces.forEach(function (piece, index) {
      self.pieces[index] = null
      self._reservations[index] = null
      self.bitfield.set(index, true)
    })
    self._checkDone()
    cb(null)
  })
}

Torrent.prototype.createServer = function (opts) {
  if (this.destroyed) throw new Error('torrent is destroyed')

  if (typeof Server !== 'function') throw new Error('node.js-only method')
  var server = new Server(this, opts)
  this._servers.push(server)
  return server
}

Torrent.prototype.pause = function () {
  if (this.destroyed) return
  this.swarm.pause()
}

Torrent.prototype.resume = function () {
  if (this.destroyed) return
  this.swarm.resume()
}

Torrent.prototype._onError = function (err) {
  var self = this
  debug('torrent error: %s', err.message || err)
  self.emit('error', err)
  self.destroy()
}

function getPipelineLength (wire, duration) {
  return Math.ceil(2 + duration * wire.downloadSpeed() / Piece.BLOCK_LENGTH)
}

/**
 * Returns a random integer in [0,high)
 */
function randomInt (high) {
  return Math.random() * high | 0
}

function noop () {}
