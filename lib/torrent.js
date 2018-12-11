/* global URL, Blob */

const addrToIPPort = require('addr-to-ip-port')
const BitField = require('bitfield')
const ChunkStoreWriteStream = require('chunk-store-stream/write')
const debug = require('debug')('webtorrent:torrent')
const Discovery = require('torrent-discovery')
const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const FSChunkStore = require('fs-chunk-store') // browser: `memory-chunk-store`
const get = require('simple-get')
const ImmediateChunkStore = require('immediate-chunk-store')
const MultiStream = require('multistream')
const net = require('net') // browser exclude
const os = require('os') // browser exclude
const parallel = require('run-parallel')
const parallelLimit = require('run-parallel-limit')
const parseTorrent = require('parse-torrent')
const path = require('path')
const Piece = require('torrent-piece')
const pump = require('pump')
const randomIterate = require('random-iterate')
const sha1 = require('simple-sha1')
const speedometer = require('speedometer')
const uniq = require('uniq')
const utMetadata = require('ut_metadata')
const utPex = require('ut_pex') // browser exclude
const parseRange = require('parse-numeric-range')

const File = require('./file')
const Peer = require('./peer')
const RarityMap = require('./rarity-map')
const Server = require('./server') // browser exclude

const MAX_BLOCK_LENGTH = 128 * 1024
const PIECE_TIMEOUT = 30000
const CHOKE_TIMEOUT = 5000
const SPEED_THRESHOLD = 3 * Piece.BLOCK_LENGTH

const PIPELINE_MIN_DURATION = 0.5
const PIPELINE_MAX_DURATION = 1

const RECHOKE_INTERVAL = 10000 // 10 seconds
const RECHOKE_OPTIMISTIC_DURATION = 2 // 30 seconds

// IndexedDB chunk stores used in the browser benefit from maximum concurrency
const FILESYSTEM_CONCURRENCY = process.browser ? Infinity : 2

const RECONNECT_WAIT = [ 1000, 5000, 15000 ]

const VERSION = require('../package.json').version
const USER_AGENT = `WebTorrent/${VERSION} (https://webtorrent.io)`

let TMP
try {
  TMP = path.join(fs.statSync('/tmp') && '/tmp', 'webtorrent')
} catch (err) {
  TMP = path.join(typeof os.tmpdir === 'function' ? os.tmpdir() : '/', 'webtorrent')
}

class Torrent extends EventEmitter {
  constructor (torrentId, client, opts) {
    super()

    this._debugId = 'unknown infohash'
    this.client = client

    this.announce = opts.announce
    this.urlList = opts.urlList

    this.path = opts.path
    this.skipVerify = !!opts.skipVerify
    this._store = opts.store || FSChunkStore
    this._getAnnounceOpts = opts.getAnnounceOpts

    this.strategy = opts.strategy || 'sequential'

    this.maxWebConns = opts.maxWebConns || 4

    this._rechokeNumSlots = (opts.uploads === false || opts.uploads === 0)
      ? 0
      : (+opts.uploads || 10)
    this._rechokeOptimisticWire = null
    this._rechokeOptimisticTime = 0
    this._rechokeIntervalId = null

    this.ready = false
    this.destroyed = false
    this.paused = false
    this.done = false

    this.metadata = null
    this.store = null
    this.files = []
    this.pieces = []

    this._amInterested = false
    this._selections = []
    this._critical = []

    this.wires = [] // open wires (added *after* handshake)

    this._queue = [] // queue of outgoing tcp peers to connect to
    this._peers = {} // connected peers (addr/peerId -> Peer)
    this._peersLength = 0 // number of elements in `this._peers` (cache, for perf)

    // stats
    this.received = 0
    this.uploaded = 0
    this._downloadSpeed = speedometer()
    this._uploadSpeed = speedometer()

    // for cleanup
    this._servers = []
    this._xsRequests = []

    // TODO: remove this and expose a hook instead
    // optimization: don't recheck every file if it hasn't changed
    this._fileModtimes = opts.fileModtimes

    if (torrentId !== null) this._onTorrentId(torrentId)

    this._debug('new torrent')
  }

  get timeRemaining () {
    if (this.done) return 0
    if (this.downloadSpeed === 0) return Infinity
    return ((this.length - this.downloaded) / this.downloadSpeed) * 1000
  }

  get downloaded () {
    if (!this.bitfield) return 0
    let downloaded = 0
    for (let index = 0, len = this.pieces.length; index < len; ++index) {
      if (this.bitfield.get(index)) { // verified data
        downloaded += (index === len - 1) ? this.lastPieceLength : this.pieceLength
      } else { // "in progress" data
        const piece = this.pieces[index]
        downloaded += (piece.length - piece.missing)
      }
    }
    return downloaded
  }

  // TODO: re-enable this. The number of missing pieces. Used to implement 'end game' mode.
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

  get downloadSpeed () { return this._downloadSpeed() }

  get uploadSpeed () { return this._uploadSpeed() }

  get progress () { return this.length ? this.downloaded / this.length : 0 }

  get ratio () { return this.uploaded / (this.received || 1) }

  get numPeers () { return this.wires.length }

  get torrentFileBlobURL () {
    if (typeof window === 'undefined') throw new Error('browser-only property')
    if (!this.torrentFile) return null
    return URL.createObjectURL(
      new Blob([ this.torrentFile ], { type: 'application/x-bittorrent' })
    )
  }

  get _numQueued () {
    return this._queue.length + (this._peersLength - this._numConns)
  }

  get _numConns () {
    let numConns = 0
    for (const id in this._peers) {
      if (this._peers[id].connected) numConns += 1
    }
    return numConns
  }

  // TODO: remove in v1
  get swarm () {
    console.warn('WebTorrent: `torrent.swarm` is deprecated. Use `torrent` directly instead.')
    return this
  }

  _onTorrentId (torrentId) {
    if (this.destroyed) return

    let parsedTorrent
    try { parsedTorrent = parseTorrent(torrentId) } catch (err) {}
    if (parsedTorrent) {
      // Attempt to set infoHash property synchronously
      this.infoHash = parsedTorrent.infoHash
      this._debugId = parsedTorrent.infoHash.toString('hex').substring(0, 7)
      process.nextTick(() => {
        if (this.destroyed) return
        this._onParsedTorrent(parsedTorrent)
      })
    } else {
      // If torrentId failed to parse, it could be in a form that requires an async
      // operation, i.e. http/https link, filesystem path, or Blob.
      parseTorrent.remote(torrentId, (err, parsedTorrent) => {
        if (this.destroyed) return
        if (err) return this._destroy(err)
        this._onParsedTorrent(parsedTorrent)
      })
    }
  }

  _onParsedTorrent (parsedTorrent) {
    if (this.destroyed) return

    this._processParsedTorrent(parsedTorrent)

    if (!this.infoHash) {
      return this._destroy(new Error('Malformed torrent data: No info hash'))
    }

    if (!this.path) this.path = path.join(TMP, this.infoHash)

    this._rechokeIntervalId = setInterval(() => {
      this._rechoke()
    }, RECHOKE_INTERVAL)
    if (this._rechokeIntervalId.unref) this._rechokeIntervalId.unref()

    // Private 'infoHash' event allows client.add to check for duplicate torrents and
    // destroy them before the normal 'infoHash' event is emitted. Prevents user
    // applications from needing to deal with duplicate 'infoHash' events.
    this.emit('_infoHash', this.infoHash)
    if (this.destroyed) return

    this.emit('infoHash', this.infoHash)
    if (this.destroyed) return // user might destroy torrent in event handler

    if (this.client.listening) {
      this._onListening()
    } else {
      this.client.once('listening', () => {
        this._onListening()
      })
    }
  }

  _processParsedTorrent (parsedTorrent) {
    this._debugId = parsedTorrent.infoHash.toString('hex').substring(0, 7)

    if (this.announce) {
      // Allow specifying trackers via `opts` parameter
      parsedTorrent.announce = parsedTorrent.announce.concat(this.announce)
    }

    if (this.client.tracker && global.WEBTORRENT_ANNOUNCE && !this.private) {
      // So `webtorrent-hybrid` can force specific trackers to be used
      parsedTorrent.announce = parsedTorrent.announce.concat(global.WEBTORRENT_ANNOUNCE)
    }

    if (this.urlList) {
      // Allow specifying web seeds via `opts` parameter
      parsedTorrent.urlList = parsedTorrent.urlList.concat(this.urlList)
    }

    uniq(parsedTorrent.announce)
    uniq(parsedTorrent.urlList)

    Object.assign(this, parsedTorrent)

    this.magnetURI = parseTorrent.toMagnetURI(parsedTorrent)
    this.torrentFile = parseTorrent.toTorrentFile(parsedTorrent)
  }

  _onListening () {
    if (this.discovery || this.destroyed) return

    let trackerOpts = this.client.tracker
    if (trackerOpts) {
      trackerOpts = Object.assign({}, this.client.tracker, {
        getAnnounceOpts: () => {
          const opts = {
            uploaded: this.uploaded,
            downloaded: this.downloaded,
            left: Math.max(this.length - this.downloaded, 0)
          }
          if (this.client.tracker.getAnnounceOpts) {
            Object.assign(opts, this.client.tracker.getAnnounceOpts())
          }
          if (this._getAnnounceOpts) {
            // TODO: consider deprecating this, as it's redundant with the former case
            Object.assign(opts, this._getAnnounceOpts())
          }
          return opts
        }
      })
    }

    // begin discovering peers via DHT and trackers
    this.discovery = new Discovery({
      infoHash: this.infoHash,
      announce: this.announce,
      peerId: this.client.peerId,
      dht: !this.private && this.client.dht,
      tracker: trackerOpts,
      port: this.client.torrentPort,
      userAgent: USER_AGENT
    })

    this.discovery.on('error', (err) => {
      this._destroy(err)
    })

    this.discovery.on('peer', (peer) => {
      // Don't create new outgoing TCP connections when torrent is done
      if (typeof peer === 'string' && this.done) return
      this.addPeer(peer)
    })

    this.discovery.on('trackerAnnounce', () => {
      this.emit('trackerAnnounce')
      if (this.numPeers === 0) this.emit('noPeers', 'tracker')
    })

    this.discovery.on('dhtAnnounce', () => {
      this.emit('dhtAnnounce')
      if (this.numPeers === 0) this.emit('noPeers', 'dht')
    })

    this.discovery.on('warning', (err) => {
      this.emit('warning', err)
    })

    if (this.info) {
      // if full metadata was included in initial torrent id, use it immediately. Otherwise,
      // wait for torrent-discovery to find peers and ut_metadata to get the metadata.
      this._onMetadata(this)
    } else if (this.xs) {
      this._getMetadataFromServer()
    }
  }

  _getMetadataFromServer () {
    // to allow function hoisting
    const self = this

    const urls = Array.isArray(this.xs) ? this.xs : [ this.xs ]

    const tasks = urls.map(url => cb => {
      getMetadataFromURL(url, cb)
    })
    parallel(tasks)

    function getMetadataFromURL (url, cb) {
      if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
        self.emit('warning', new Error(`skipping non-http xs param: ${url}`))
        return cb(null)
      }

      const opts = {
        url,
        method: 'GET',
        headers: {
          'user-agent': USER_AGENT
        }
      }
      let req
      try {
        req = get.concat(opts, onResponse)
      } catch (err) {
        self.emit('warning', new Error(`skipping invalid url xs param: ${url}`))
        return cb(null)
      }

      self._xsRequests.push(req)

      function onResponse (err, res, torrent) {
        if (self.destroyed) return cb(null)
        if (self.metadata) return cb(null)

        if (err) {
          self.emit('warning', new Error(`http error from xs param: ${url}`))
          return cb(null)
        }
        if (res.statusCode !== 200) {
          self.emit('warning', new Error(`non-200 status code ${res.statusCode} from xs param: ${url}`))
          return cb(null)
        }

        let parsedTorrent
        try {
          parsedTorrent = parseTorrent(torrent)
        } catch (err) {}

        if (!parsedTorrent) {
          self.emit('warning', new Error(`got invalid torrent file from xs param: ${url}`))
          return cb(null)
        }

        if (parsedTorrent.infoHash !== self.infoHash) {
          self.emit('warning', new Error(`got torrent file with incorrect info hash from xs param: ${url}`))
          return cb(null)
        }

        self._onMetadata(parsedTorrent)
        cb(null)
      }
    }
  }

  /**
   * Called when the full torrent metadata is received.
   */
  _onMetadata (metadata) {
    if (this.metadata || this.destroyed) return
    this._debug('got metadata')

    this._xsRequests.forEach(req => {
      req.abort()
    })
    this._xsRequests = []

    let parsedTorrent
    if (metadata && metadata.infoHash) {
      // `metadata` is a parsed torrent (from parse-torrent module)
      parsedTorrent = metadata
    } else {
      try {
        parsedTorrent = parseTorrent(metadata)
      } catch (err) {
        return this._destroy(err)
      }
    }

    this._processParsedTorrent(parsedTorrent)
    this.metadata = this.torrentFile

    // add web seed urls (BEP19)
    if (this.client.enableWebSeeds) {
      this.urlList.forEach(url => {
        this.addWebSeed(url)
      })
    }

    this._rarityMap = new RarityMap(this)

    this.store = new ImmediateChunkStore(
      new this._store(this.pieceLength, {
        torrent: {
          infoHash: this.infoHash
        },
        files: this.files.map(file => ({
          path: path.join(this.path, file.path),
          length: file.length,
          offset: file.offset
        })),
        length: this.length,
        name: this.infoHash
      })
    )

    this.files = this.files.map(file => new File(this, file))

    // Select only specified files (BEP53) http://www.bittorrent.org/beps/bep_0053.html
    if (this.so) {
      const selectOnlyFiles = parseRange.parse(this.so)

      this.files.forEach((v, i) => {
        if (selectOnlyFiles.includes(i)) this.files[i].select(true)
      })
    } else {
      // start off selecting the entire torrent with low priority
      if (this.pieces.length !== 0) {
        this.select(0, this.pieces.length - 1, false)
      }
    }

    this._hashes = this.pieces

    this.pieces = this.pieces.map((hash, i) => {
      const pieceLength = (i === this.pieces.length - 1)
        ? this.lastPieceLength
        : this.pieceLength
      return new Piece(pieceLength)
    })

    this._reservations = this.pieces.map(() => [])

    this.bitfield = new BitField(this.pieces.length)

    this.wires.forEach(wire => {
      // If we didn't have the metadata at the time ut_metadata was initialized for this
      // wire, we still want to make it available to the peer in case they request it.
      if (wire.ut_metadata) wire.ut_metadata.setMetadata(this.metadata)

      this._onWireWithMetadata(wire)
    })

    if (this.skipVerify) {
      // Skip verifying exisitng data and just assume it's correct
      this._markAllVerified()
      this._onStore()
    } else {
      this._debug('verifying existing torrent data')
      if (this._fileModtimes && this._store === FSChunkStore) {
        // don't verify if the files haven't been modified since we last checked
        this.getFileModtimes((err, fileModtimes) => {
          if (err) return this._destroy(err)

          const unchanged = this.files.map((_, index) => fileModtimes[index] === this._fileModtimes[index]).every(x => x)

          if (unchanged) {
            this._markAllVerified()
            this._onStore()
          } else {
            this._verifyPieces()
          }
        })
      } else {
        this._verifyPieces()
      }
    }

    this.emit('metadata')
  }

  /*
   * TODO: remove this
   * Gets the last modified time of every file on disk for this torrent.
   * Only valid in Node, not in the browser.
   */
  getFileModtimes (cb) {
    const ret = []
    parallelLimit(this.files.map((file, index) => cb => {
      fs.stat(path.join(this.path, file.path), (err, stat) => {
        if (err && err.code !== 'ENOENT') return cb(err)
        ret[index] = stat && stat.mtime.getTime()
        cb(null)
      })
    }), FILESYSTEM_CONCURRENCY, err => {
      this._debug('done getting file modtimes')
      cb(err, ret)
    })
  }

  _verifyPieces () {
    parallelLimit(this.pieces.map((_, index) => cb => {
      if (this.destroyed) return cb(new Error('torrent is destroyed'))

      this.store.get(index, (err, buf) => {
        if (this.destroyed) return cb(new Error('torrent is destroyed'))

        if (err) return process.nextTick(cb, null) // ignore error
        sha1(buf, hash => {
          if (this.destroyed) return cb(new Error('torrent is destroyed'))

          if (hash === this._hashes[index]) {
            if (!this.pieces[index]) return
            this._debug('piece verified %s', index)
            this._markVerified(index)
          } else {
            this._debug('piece invalid %s', index)
          }
          cb(null)
        })
      })
    }), FILESYSTEM_CONCURRENCY, err => {
      if (err) return this._destroy(err)
      this._debug('done verifying')
      this._onStore()
    })
  }

  _markAllVerified () {
    for (let index = 0; index < this.pieces.length; index++) {
      this._markVerified(index)
    }
  }

  _markVerified (index) {
    this.pieces[index] = null
    this._reservations[index] = null
    this.bitfield.set(index, true)
  }

  /**
   * Called when the metadata, listening server, and underlying chunk store is initialized.
   */
  _onStore () {
    if (this.destroyed) return
    this._debug('on store')

    this.ready = true
    this.emit('ready')

    // Files may start out done if the file was already in the store
    this._checkDone()

    // In case any selections were made before torrent was ready
    this._updateSelections()
  }

  destroy (cb) {
    this._destroy(null, cb)
  }

  _destroy (err, cb) {
    if (this.destroyed) return
    this.destroyed = true
    this._debug('destroy')

    this.client._remove(this)

    clearInterval(this._rechokeIntervalId)

    this._xsRequests.forEach(req => {
      req.abort()
    })

    if (this._rarityMap) {
      this._rarityMap.destroy()
    }

    for (const id in this._peers) {
      this.removePeer(id)
    }

    this.files.forEach(file => {
      if (file instanceof File) file._destroy()
    })

    const tasks = this._servers.map(server => cb => {
      server.destroy(cb)
    })

    if (this.discovery) {
      tasks.push(cb => {
        this.discovery.destroy(cb)
      })
    }

    if (this.store) {
      tasks.push(cb => {
        this.store.close(cb)
      })
    }

    parallel(tasks, cb)

    if (err) {
      // Torrent errors are emitted at `torrent.on('error')`. If there are no 'error'
      // event handlers on the torrent instance, then the error will be emitted at
      // `client.on('error')`. This prevents throwing an uncaught exception
      // (unhandled 'error' event), but it makes it impossible to distinguish client
      // errors versus torrent errors. Torrent errors are not fatal, and the client
      // is still usable afterwards. Therefore, always listen for errors in both
      // places (`client.on('error')` and `torrent.on('error')`).
      if (this.listenerCount('error') === 0) {
        this.client.emit('error', err)
      } else {
        this.emit('error', err)
      }
    }

    this.emit('close')

    this.client = null
    this.files = []
    this.discovery = null
    this.store = null
    this._rarityMap = null
    this._peers = null
    this._servers = null
    this._xsRequests = null
  }

  addPeer (peer) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!this.infoHash) throw new Error('addPeer() must not be called before the `infoHash` event')

    if (this.client.blocked) {
      let host
      if (typeof peer === 'string') {
        let parts
        try {
          parts = addrToIPPort(peer)
        } catch (e) {
          this._debug('ignoring peer: invalid %s', peer)
          this.emit('invalidPeer', peer)
          return false
        }
        host = parts[0]
      } else if (typeof peer.remoteAddress === 'string') {
        host = peer.remoteAddress
      }

      if (host && this.client.blocked.contains(host)) {
        this._debug('ignoring peer: blocked %s', peer)
        if (typeof peer !== 'string') peer.destroy()
        this.emit('blockedPeer', peer)
        return false
      }
    }

    const wasAdded = !!this._addPeer(peer)
    if (wasAdded) {
      this.emit('peer', peer)
    } else {
      this.emit('invalidPeer', peer)
    }
    return wasAdded
  }

  _addPeer (peer) {
    if (this.destroyed) {
      if (typeof peer !== 'string') peer.destroy()
      return null
    }
    if (typeof peer === 'string' && !this._validAddr(peer)) {
      this._debug('ignoring peer: invalid %s', peer)
      return null
    }

    const id = (peer && peer.id) || peer
    if (this._peers[id]) {
      this._debug('ignoring peer: duplicate (%s)', id)
      if (typeof peer !== 'string') peer.destroy()
      return null
    }

    if (this.paused) {
      this._debug('ignoring peer: torrent is paused')
      if (typeof peer !== 'string') peer.destroy()
      return null
    }

    this._debug('add peer %s', id)

    let newPeer
    if (typeof peer === 'string') {
      // `peer` is an addr ("ip:port" string)
      newPeer = Peer.createTCPOutgoingPeer(peer, this)
    } else {
      // `peer` is a WebRTC connection (simple-peer)
      newPeer = Peer.createWebRTCPeer(peer, this)
    }

    this._peers[newPeer.id] = newPeer
    this._peersLength += 1

    if (typeof peer === 'string') {
      // `peer` is an addr ("ip:port" string)
      this._queue.push(newPeer)
      this._drain()
    }

    return newPeer
  }

  addWebSeed (url) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    if (!/^https?:\/\/.+/.test(url)) {
      this.emit('warning', new Error(`ignoring invalid web seed: ${url}`))
      this.emit('invalidPeer', url)
      return
    }

    if (this._peers[url]) {
      this.emit('warning', new Error(`ignoring duplicate web seed: ${url}`))
      this.emit('invalidPeer', url)
      return
    }

    this._debug('add web seed %s', url)

    const newPeer = Peer.createWebSeedPeer(url, this)
    this._peers[newPeer.id] = newPeer
    this._peersLength += 1

    this.emit('peer', url)
  }

  /**
   * Called whenever a new incoming TCP peer connects to this torrent swarm. Called with a
   * peer that has already sent a handshake.
   */
  _addIncomingPeer (peer) {
    if (this.destroyed) return peer.destroy(new Error('torrent is destroyed'))
    if (this.paused) return peer.destroy(new Error('torrent is paused'))

    this._debug('add incoming peer %s', peer.id)

    this._peers[peer.id] = peer
    this._peersLength += 1
  }

  removePeer (peer) {
    const id = (peer && peer.id) || peer
    peer = this._peers[id]

    if (!peer) return

    this._debug('removePeer %s', id)

    delete this._peers[id]
    this._peersLength -= 1

    peer.destroy()

    // If torrent swarm was at capacity before, try to open a new connection now
    this._drain()
  }

  select (start, end, priority, notify) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    if (start < 0 || end < start || this.pieces.length <= end) {
      throw new Error('invalid selection ', start, ':', end)
    }
    priority = Number(priority) || 0

    this._debug('select %s-%s (priority %s)', start, end, priority)

    this._selections.push({
      from: start,
      to: end,
      offset: 0,
      priority,
      notify: notify || noop
    })

    this._selections.sort((a, b) => b.priority - a.priority)

    this._updateSelections()
  }

  deselect (start, end, priority) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    priority = Number(priority) || 0
    this._debug('deselect %s-%s (priority %s)', start, end, priority)

    for (let i = 0; i < this._selections.length; ++i) {
      const s = this._selections[i]
      if (s.from === start && s.to === end && s.priority === priority) {
        this._selections.splice(i, 1)
        break
      }
    }

    this._updateSelections()
  }

  critical (start, end) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    this._debug('critical %s-%s', start, end)

    for (let i = start; i <= end; ++i) {
      this._critical[i] = true
    }

    this._updateSelections()
  }

  _onWire (wire, addr) {
    this._debug('got wire %s (%s)', wire._debugId, addr || 'Unknown')

    wire.on('download', downloaded => {
      if (this.destroyed) return
      this.received += downloaded
      this._downloadSpeed(downloaded)
      this.client._downloadSpeed(downloaded)
      this.emit('download', downloaded)
      this.client.emit('download', downloaded)
    })

    wire.on('upload', uploaded => {
      if (this.destroyed) return
      this.uploaded += uploaded
      this._uploadSpeed(uploaded)
      this.client._uploadSpeed(uploaded)
      this.emit('upload', uploaded)
      this.client.emit('upload', uploaded)
    })

    this.wires.push(wire)

    if (addr) {
      // Sometimes RTCPeerConnection.getStats() doesn't return an ip:port for peers
      const parts = addrToIPPort(addr)
      wire.remoteAddress = parts[0]
      wire.remotePort = parts[1]
    }

    // When peer sends PORT message, add that DHT node to routing table
    if (this.client.dht && this.client.dht.listening) {
      wire.on('port', port => {
        if (this.destroyed || this.client.dht.destroyed) {
          return
        }
        if (!wire.remoteAddress) {
          return this._debug('ignoring PORT from peer with no address')
        }
        if (port === 0 || port > 65536) {
          return this._debug('ignoring invalid PORT from peer')
        }

        this._debug('port: %s (from %s)', port, addr)
        this.client.dht.addNode({ host: wire.remoteAddress, port })
      })
    }

    wire.on('timeout', () => {
      this._debug('wire timeout (%s)', addr)
      // TODO: this might be destroying wires too eagerly
      wire.destroy()
    })

    // Timeout for piece requests to this peer
    wire.setTimeout(PIECE_TIMEOUT, true)

    // Send KEEP-ALIVE (every 60s) so peers will not disconnect the wire
    wire.setKeepAlive(true)

    // use ut_metadata extension
    wire.use(utMetadata(this.metadata))

    wire.ut_metadata.on('warning', err => {
      this._debug('ut_metadata warning: %s', err.message)
    })

    if (!this.metadata) {
      wire.ut_metadata.on('metadata', metadata => {
        this._debug('got metadata via ut_metadata')
        this._onMetadata(metadata)
      })
      wire.ut_metadata.fetch()
    }

    // use ut_pex extension if the torrent is not flagged as private
    if (typeof utPex === 'function' && !this.private) {
      wire.use(utPex())

      wire.ut_pex.on('peer', peer => {
        // Only add potential new peers when we're not seeding
        if (this.done) return
        this._debug('ut_pex: got peer: %s (from %s)', peer, addr)
        this.addPeer(peer)
      })

      wire.ut_pex.on('dropped', peer => {
        // the remote peer believes a given peer has been dropped from the torrent swarm.
        // if we're not currently connected to it, then remove it from the queue.
        const peerObj = this._peers[peer]
        if (peerObj && !peerObj.connected) {
          this._debug('ut_pex: dropped peer: %s (from %s)', peer, addr)
          this.removePeer(peer)
        }
      })

      wire.once('close', () => {
        // Stop sending updates to remote peer
        wire.ut_pex.reset()
      })
    }

    // Hook to allow user-defined `bittorrent-protocol` extensions
    // More info: https://github.com/webtorrent/bittorrent-protocol#extension-api
    this.emit('wire', wire, addr)

    if (this.metadata) {
      process.nextTick(() => {
        // This allows wire.handshake() to be called (by Peer.onHandshake) before any
        // messages get sent on the wire
        this._onWireWithMetadata(wire)
      })
    }
  }

  _onWireWithMetadata (wire) {
    let timeoutId = null

    const onChokeTimeout = () => {
      if (this.destroyed || wire.destroyed) return

      if (this._numQueued > 2 * (this._numConns - this.numPeers) &&
        wire.amInterested) {
        wire.destroy()
      } else {
        timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
        if (timeoutId.unref) timeoutId.unref()
      }
    }

    let i
    const updateSeedStatus = () => {
      if (wire.peerPieces.buffer.length !== this.bitfield.buffer.length) return
      for (i = 0; i < this.pieces.length; ++i) {
        if (!wire.peerPieces.get(i)) return
      }
      wire.isSeeder = true
      wire.choke() // always choke seeders
    }

    wire.on('bitfield', () => {
      updateSeedStatus()
      this._update()
    })

    wire.on('have', () => {
      updateSeedStatus()
      this._update()
    })

    wire.once('interested', () => {
      wire.unchoke()
    })

    wire.once('close', () => {
      clearTimeout(timeoutId)
    })

    wire.on('choke', () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
      if (timeoutId.unref) timeoutId.unref()
    })

    wire.on('unchoke', () => {
      clearTimeout(timeoutId)
      this._update()
    })

    wire.on('request', (index, offset, length, cb) => {
      if (length > MAX_BLOCK_LENGTH) {
        // Per spec, disconnect from peers that request >128KB
        return wire.destroy()
      }
      if (this.pieces[index]) return
      this.store.get(index, { offset, length }, cb)
    })

    wire.bitfield(this.bitfield) // always send bitfield (required)
    wire.uninterested() // always start out uninterested (as per protocol)

    // Send PORT message to peers that support DHT
    if (wire.peerExtensions.dht && this.client.dht && this.client.dht.listening) {
      wire.port(this.client.dht.address().port)
    }

    if (wire.type !== 'webSeed') { // do not choke on webseeds
      timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
      if (timeoutId.unref) timeoutId.unref()
    }

    wire.isSeeder = false
    updateSeedStatus()
  }

  /**
   * Called on selection changes.
   */
  _updateSelections () {
    if (!this.ready || this.destroyed) return

    process.nextTick(() => {
      this._gcSelections()
    })
    this._updateInterest()
    this._update()
  }

  /**
   * Garbage collect selections with respect to the store's current state.
   */
  _gcSelections () {
    for (let i = 0; i < this._selections.length; ++i) {
      const s = this._selections[i]
      const oldOffset = s.offset

      // check for newly downloaded pieces in selection
      while (this.bitfield.get(s.from + s.offset) && s.from + s.offset < s.to) {
        s.offset += 1
      }

      if (oldOffset !== s.offset) s.notify()
      if (s.to !== s.from + s.offset) continue
      if (!this.bitfield.get(s.from + s.offset)) continue

      this._selections.splice(i, 1) // remove fully downloaded selection
      i -= 1 // decrement i to offset splice

      s.notify()
      this._updateInterest()
    }

    if (!this._selections.length) this.emit('idle')
  }

  /**
   * Update interested status for all peers.
   */
  _updateInterest () {
    const prev = this._amInterested
    this._amInterested = !!this._selections.length

    this.wires.forEach(wire => {
      let interested = false
      for (let index = 0; index < this.pieces.length; ++index) {
        if (this.pieces[index] && wire.peerPieces.get(index)) {
          interested = true
          break
        }
      }

      if (interested) wire.interested()
      else wire.uninterested()
    })

    if (prev === this._amInterested) return
    if (this._amInterested) this.emit('interested')
    else this.emit('uninterested')
  }

  /**
   * Heartbeat to update all peers and their requests.
   */
  _update () {
    if (this.destroyed) return

    // update wires in random order for better request distribution
    const ite = randomIterate(this.wires)
    let wire
    while ((wire = ite())) {
      this._updateWireWrapper(wire)
    }
  }

  _updateWireWrapper (wire) {
    const self = this

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(function () { self._updateWire(wire) })
    } else {
      self._updateWire(wire)
    }
  }

  /**
   * Attempts to update a peer's requests
   */
  _updateWire (wire) {
    // to allow function hoisting
    const self = this

    if (wire.peerChoking) return
    if (!wire.downloaded) return validateWire()

    const minOutstandingRequests = getBlockPipelineLength(wire, PIPELINE_MIN_DURATION)
    if (wire.requests.length >= minOutstandingRequests) return
    const maxOutstandingRequests = getBlockPipelineLength(wire, PIPELINE_MAX_DURATION)

    trySelectWire(false) || trySelectWire(true)

    function genPieceFilterFunc (start, end, tried, rank) {
      return i => i >= start && i <= end && !(i in tried) && wire.peerPieces.get(i) && (!rank || rank(i))
    }

    // TODO: Do we need both validateWire and trySelectWire?
    function validateWire () {
      if (wire.requests.length) return

      let i = self._selections.length
      while (i--) {
        const next = self._selections[i]
        let piece
        if (self.strategy === 'rarest') {
          const start = next.from + next.offset
          const end = next.to
          const len = end - start + 1
          const tried = {}
          let tries = 0
          const filter = genPieceFilterFunc(start, end, tried)

          while (tries < len) {
            piece = self._rarityMap.getRarestPiece(filter)
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
      const speed = wire.downloadSpeed() || 1
      if (speed > SPEED_THRESHOLD) return () => true

      const secs = Math.max(1, wire.requests.length) * Piece.BLOCK_LENGTH / speed
      let tries = 10
      let ptr = 0

      return index => {
        if (!tries || self.bitfield.get(index)) return true

        let missing = self.pieces[index].missing

        for (; ptr < self.wires.length; ptr++) {
          const otherWire = self.wires[ptr]
          const otherSpeed = otherWire.downloadSpeed()

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
      let last = i
      for (let j = i; j < self._selections.length && self._selections[j].priority; j++) {
        last = j
      }
      const tmp = self._selections[i]
      self._selections[i] = self._selections[last]
      self._selections[last] = tmp
    }

    function trySelectWire (hotswap) {
      if (wire.requests.length >= maxOutstandingRequests) return true
      const rank = speedRanker()

      for (let i = 0; i < self._selections.length; i++) {
        const next = self._selections[i]

        let piece
        if (self.strategy === 'rarest') {
          const start = next.from + next.offset
          const end = next.to
          const len = end - start + 1
          const tried = {}
          let tries = 0
          const filter = genPieceFilterFunc(start, end, tried, rank)

          while (tries < len) {
            piece = self._rarityMap.getRarestPiece(filter)
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
  _rechoke () {
    if (!this.ready) return

    if (this._rechokeOptimisticTime > 0) this._rechokeOptimisticTime -= 1
    else this._rechokeOptimisticWire = null

    const peers = []

    this.wires.forEach(wire => {
      if (!wire.isSeeder && wire !== this._rechokeOptimisticWire) {
        peers.push({
          wire,
          downloadSpeed: wire.downloadSpeed(),
          uploadSpeed: wire.uploadSpeed(),
          salt: Math.random(),
          isChoked: true
        })
      }
    })

    peers.sort(rechokeSort)

    let unchokeInterested = 0
    let i = 0
    for (; i < peers.length && unchokeInterested < this._rechokeNumSlots; ++i) {
      peers[i].isChoked = false
      if (peers[i].wire.peerInterested) unchokeInterested += 1
    }

    // Optimistically unchoke a peer
    if (!this._rechokeOptimisticWire && i < peers.length && this._rechokeNumSlots) {
      const candidates = peers.slice(i).filter(peer => peer.wire.peerInterested)
      const optimistic = candidates[randomInt(candidates.length)]

      if (optimistic) {
        optimistic.isChoked = false
        this._rechokeOptimisticWire = optimistic.wire
        this._rechokeOptimisticTime = RECHOKE_OPTIMISTIC_DURATION
      }
    }

    // Unchoke best peers
    peers.forEach(peer => {
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
  _hotswap (wire, index) {
    const speed = wire.downloadSpeed()
    if (speed < Piece.BLOCK_LENGTH) return false
    if (!this._reservations[index]) return false

    const r = this._reservations[index]
    if (!r) {
      return false
    }

    let minSpeed = Infinity
    let minWire

    let i
    for (i = 0; i < r.length; i++) {
      const otherWire = r[i]
      if (!otherWire || otherWire === wire) continue

      const otherSpeed = otherWire.downloadSpeed()
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
      const req = minWire.requests[i]
      if (req.piece !== index) continue

      this.pieces[index].cancel((req.offset / Piece.BLOCK_LENGTH) | 0)
    }

    this.emit('hotswap', minWire, wire, index)
    return true
  }

  /**
   * Attempts to request a block from the given wire.
   */
  _request (wire, index, hotswap) {
    const self = this
    const numRequests = wire.requests.length
    const isWebSeed = wire.type === 'webSeed'

    if (self.bitfield.get(index)) return false

    const maxOutstandingRequests = isWebSeed
      ? Math.min(
        getPiecePipelineLength(wire, PIPELINE_MAX_DURATION, self.pieceLength),
        self.maxWebConns
      )
      : getBlockPipelineLength(wire, PIPELINE_MAX_DURATION)

    if (numRequests >= maxOutstandingRequests) return false
    // var endGame = (wire.requests.length === 0 && self.store.numMissing < 30)

    const piece = self.pieces[index]
    let reservation = isWebSeed ? piece.reserveRemaining() : piece.reserve()

    if (reservation === -1 && hotswap && self._hotswap(wire, index)) {
      reservation = isWebSeed ? piece.reserveRemaining() : piece.reserve()
    }
    if (reservation === -1) return false

    let r = self._reservations[index]
    if (!r) r = self._reservations[index] = []
    let i = r.indexOf(null)
    if (i === -1) i = r.length
    r[i] = wire

    const chunkOffset = piece.chunkOffset(reservation)
    const chunkLength = isWebSeed ? piece.chunkLengthRemaining(reservation) : piece.chunkLength(reservation)

    wire.request(index, chunkOffset, chunkLength, function onChunk (err, chunk) {
      if (self.destroyed) return

      // TODO: what is this for?
      if (!self.ready) return self.once('ready', () => { onChunk(err, chunk) })

      if (r[i] === wire) r[i] = null

      if (piece !== self.pieces[index]) return onUpdateTick()

      if (err) {
        self._debug(
          'error getting piece %s (offset: %s length: %s) from %s: %s',
          index, chunkOffset, chunkLength, `${wire.remoteAddress}:${wire.remotePort}`,
          err.message
        )
        isWebSeed ? piece.cancelRemaining(reservation) : piece.cancel(reservation)
        onUpdateTick()
        return
      }

      self._debug(
        'got piece %s (offset: %s length: %s) from %s',
        index, chunkOffset, chunkLength, `${wire.remoteAddress}:${wire.remotePort}`
      )

      if (!piece.set(reservation, chunk, wire)) return onUpdateTick()

      const buf = piece.flush()

      // TODO: might need to set self.pieces[index] = null here since sha1 is async

      sha1(buf, hash => {
        if (self.destroyed) return

        if (hash === self._hashes[index]) {
          if (!self.pieces[index]) return
          self._debug('piece verified %s', index)

          self.pieces[index] = null
          self._reservations[index] = null
          self.bitfield.set(index, true)

          self.store.put(index, buf)

          self.wires.forEach(wire => {
            wire.have(index)
          })

          // We also check `self.destroyed` since `torrent.destroy()` could have been
          // called in the `torrent.on('done')` handler, triggered by `_checkDone()`.
          if (self._checkDone() && !self.destroyed) self.discovery.complete()
        } else {
          self.pieces[index] = new Piece(piece.length)
          self.emit('warning', new Error(`Piece ${index} failed verification`))
        }
        onUpdateTick()
      })
    })

    function onUpdateTick () {
      process.nextTick(() => { self._update() })
    }

    return true
  }

  _checkDone () {
    if (this.destroyed) return

    // are any new files done?
    this.files.forEach(file => {
      if (file.done) return
      for (let i = file._startPiece; i <= file._endPiece; ++i) {
        if (!this.bitfield.get(i)) return
      }
      file.done = true
      file.emit('done')
      this._debug(`file done: ${file.name}`)
    })

    // is the torrent done? (if all current selections are satisfied, or there are
    // no selections, then torrent is done)
    let done = true
    for (let i = 0; i < this._selections.length; i++) {
      const selection = this._selections[i]
      for (let piece = selection.from; piece <= selection.to; piece++) {
        if (!this.bitfield.get(piece)) {
          done = false
          break
        }
      }
      if (!done) break
    }
    if (!this.done && done) {
      this.done = true
      this._debug(`torrent done: ${this.infoHash}`)
      this.emit('done')
    }
    this._gcSelections()

    return done
  }

  load (streams, cb) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!this.ready) return this.once('ready', () => { this.load(streams, cb) })

    if (!Array.isArray(streams)) streams = [ streams ]
    if (!cb) cb = noop

    const readable = new MultiStream(streams)
    const writable = new ChunkStoreWriteStream(this.store, this.pieceLength)

    pump(readable, writable, err => {
      if (err) return cb(err)
      this._markAllVerified()
      this._checkDone()
      cb(null)
    })
  }

  createServer (requestListener) {
    if (typeof Server !== 'function') throw new Error('node.js-only method')
    if (this.destroyed) throw new Error('torrent is destroyed')
    const server = new Server(this, requestListener)
    this._servers.push(server)
    return server
  }

  pause () {
    if (this.destroyed) return
    this._debug('pause')
    this.paused = true
  }

  resume () {
    if (this.destroyed) return
    this._debug('resume')
    this.paused = false
    this._drain()
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = `[${this.client._debugId}] [${this._debugId}] ${args[0]}`
    debug(...args)
  }

  /**
   * Pop a peer off the FIFO queue and connect to it. When _drain() gets called,
   * the queue will usually have only one peer in it, except when there are too
   * many peers (over `this.maxConns`) in which case they will just sit in the
   * queue until another connection closes.
   */
  _drain () {
    this._debug('_drain numConns %s maxConns %s', this._numConns, this.client.maxConns)
    if (typeof net.connect !== 'function' || this.destroyed || this.paused ||
        this._numConns >= this.client.maxConns) {
      return
    }
    this._debug('drain (%s queued, %s/%s peers)', this._numQueued, this.numPeers, this.client.maxConns)

    const peer = this._queue.shift()
    if (!peer) return // queue could be empty

    this._debug('tcp connect attempt to %s', peer.addr)

    const parts = addrToIPPort(peer.addr)
    const opts = {
      host: parts[0],
      port: parts[1]
    }

    const conn = peer.conn = net.connect(opts)

    conn.once('connect', () => { peer.onConnect() })
    conn.once('error', err => { peer.destroy(err) })
    peer.startConnectTimeout()

    // When connection closes, attempt reconnect after timeout (with exponential backoff)
    conn.on('close', () => {
      if (this.destroyed) return

      // TODO: If torrent is done, do not try to reconnect after a timeout

      if (peer.retries >= RECONNECT_WAIT.length) {
        this._debug(
          'conn %s closed: will not re-add (max %s attempts)',
          peer.addr, RECONNECT_WAIT.length
        )
        return
      }

      const ms = RECONNECT_WAIT[peer.retries]
      this._debug(
        'conn %s closed: will re-add to queue in %sms (attempt %s)',
        peer.addr, ms, peer.retries + 1
      )

      const reconnectTimeout = setTimeout(() => {
        const newPeer = this._addPeer(peer.addr)
        if (newPeer) newPeer.retries = peer.retries + 1
      }, ms)
      if (reconnectTimeout.unref) reconnectTimeout.unref()
    })
  }

  /**
   * Returns `true` if string is valid IPv4/6 address.
   * @param {string} addr
   * @return {boolean}
   */
  _validAddr (addr) {
    let parts
    try {
      parts = addrToIPPort(addr)
    } catch (e) {
      return false
    }
    const host = parts[0]
    const port = parts[1]
    return port > 0 && port < 65535 &&
      !(host === '127.0.0.1' && port === this.client.torrentPort)
  }
}

function getBlockPipelineLength (wire, duration) {
  return 2 + Math.ceil(duration * wire.downloadSpeed() / Piece.BLOCK_LENGTH)
}

function getPiecePipelineLength (wire, duration, pieceLength) {
  return 1 + Math.ceil(duration * wire.downloadSpeed() / pieceLength)
}

/**
 * Returns a random integer in [0,high)
 */
function randomInt (high) {
  return Math.random() * high | 0
}

function noop () {}

module.exports = Torrent
