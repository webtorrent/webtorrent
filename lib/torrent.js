import EventEmitter from 'events'
import fs from 'fs'
import net from 'net' // browser exclude
import os from 'os' // browser exclude
import path from 'path'
import addrToIPPort from 'addr-to-ip-port'
import BitField from 'bitfield'
import CacheChunkStore from 'cache-chunk-store'
import { chunkStoreWrite } from 'chunk-store-iterator'
import cpus from 'cpus'
import debugFactory from 'debug'
import Discovery from 'torrent-discovery'
import FSChunkStore from 'fs-chunk-store' // browser: `hybrid-chunk-store`
import fetch from 'cross-fetch-ponyfill'
import ImmediateChunkStore from 'immediate-chunk-store'
import ltDontHave from 'lt_donthave'
import MemoryChunkStore from 'memory-chunk-store'
import HybridChunkStore from 'hybrid-chunk-store'
import joinIterator from 'join-async-iterator'
import parallel from 'run-parallel'
import parallelLimit from 'run-parallel-limit'
import parseTorrent, { toMagnetURI, toTorrentFile, remote } from 'parse-torrent'
import Piece from 'torrent-piece'
import queueMicrotask from 'queue-microtask'
import randomIterate from 'random-iterate'
import { hash, arr2hex } from 'uint8-util'
import throughput from 'throughput'
import utMetadata from 'ut_metadata'
import utPex from 'ut_pex' // browser exclude

import File from './file.js'
import Peer from './peer.js'
import RarityMap from './rarity-map.js'
import utp from './utp.cjs' // browser exclude
import WebConn from './webconn.js'
import { Selections } from './selections.js'

import info from '../package.json' assert { type: 'json' }

const debug = debugFactory('webtorrent:torrent')
const MAX_BLOCK_LENGTH = 128 * 1024
const PIECE_TIMEOUT = 30_000
const CHOKE_TIMEOUT = 5_000
const SPEED_THRESHOLD = 3 * Piece.BLOCK_LENGTH

const PIPELINE_MIN_DURATION = 0.5
const PIPELINE_MAX_DURATION = 1

const RECHOKE_INTERVAL = 10_000 // 10 seconds
const RECHOKE_OPTIMISTIC_DURATION = 2 // 30 seconds

const DEFAULT_NO_PEERS_INTERVAL = 30_000 // 30 seconds

// IndexedDB chunk stores used in the browser benefit from high concurrency
const FILESYSTEM_CONCURRENCY = process.browser ? cpus().length : 2

const RECONNECT_WAIT = [1_000, 5_000, 15_000]

const VERSION = info.version
const USER_AGENT = `WebTorrent/${VERSION} (https://webtorrent.io)`

let TMP
try {
  TMP = path.join(fs.statSync('/tmp') && '/tmp', 'webtorrent')
} catch (err) {
  TMP = path.join(typeof os.tmpdir === 'function' ? os.tmpdir() : '/', 'webtorrent')
}

const IDLE_CALLBACK = typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function' && window.requestIdleCallback

export default class Torrent extends EventEmitter {
  constructor (torrentId, client, opts) {
    super()

    this._debugId = 'unknown infohash'
    this.client = client

    this.announce = opts.announce
    this.urlList = opts.urlList

    this.path = opts.path || TMP
    this.addUID = opts.addUID || false
    this.rootDir = opts.rootDir || null
    this.skipVerify = !!opts.skipVerify
    this._store = opts.store || FSChunkStore
    this._preloadedStore = opts.preloadedStore || null
    this._storeCacheSlots = opts.storeCacheSlots !== undefined ? opts.storeCacheSlots : 20
    this._destroyStoreOnDestroy = opts.destroyStoreOnDestroy || false
    this.store = null
    this.storeOpts = opts.storeOpts
    this.alwaysChokeSeeders = opts.alwaysChokeSeeders ?? true

    this._getAnnounceOpts = opts.getAnnounceOpts

    // if defined, `opts.private` overrides default privacy of torrent
    if (typeof opts.private === 'boolean') this.private = opts.private

    this.strategy = opts.strategy || 'sequential'

    this.maxWebConns = opts.maxWebConns || 4

    this._rechokeNumSlots = (opts.uploads === false || opts.uploads === 0)
      ? 0
      : (+opts.uploads || 10)
    this._rechokeOptimisticWire = null
    this._rechokeOptimisticTime = 0
    this._rechokeIntervalId = null
    this._noPeersIntervalId = null
    this._noPeersIntervalTime = opts.noPeersIntervalTime ? opts.noPeersIntervalTime * 1000 : DEFAULT_NO_PEERS_INTERVAL
    this._startAsDeselected = opts.deselect || false

    this.ready = false
    this.destroyed = false
    this.paused = opts.paused || false
    this.done = false

    this.metadata = null
    this.files = []

    // Pieces that need to be downloaded, indexed by piece index
    this.pieces = []

    this._amInterested = false
    this._selections = new Selections()
    this._critical = []

    this.wires = [] // open wires (added *after* handshake)

    this._queue = [] // queue of outgoing tcp peers to connect to
    this._peers = {} // connected peers (addr/peerId -> Peer)
    this._peersLength = 0 // number of elements in `this._peers` (cache, for perf)

    // stats
    this.received = 0
    this.uploaded = 0
    this._downloadSpeed = throughput()
    this._uploadSpeed = throughput()

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

  get ratio () { return this.uploaded / (this.received || this.length) }

  get numPeers () { return this.wires.length }

  get torrentFileBlob () {
    if (!this.torrentFile) return null
    return new Blob([this.torrentFile], { type: 'application/x-bittorrent' })
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

  async _onTorrentId (torrentId) {
    if (this.destroyed) return

    let parsedTorrent
    try { parsedTorrent = await parseTorrent(torrentId) } catch (err) {}
    if (parsedTorrent) {
      // Attempt to set infoHash property synchronously
      this.infoHash = parsedTorrent.infoHash
      this._debugId = arr2hex(parsedTorrent.infoHash).substring(0, 7)
      queueMicrotask(() => {
        if (this.destroyed) return
        this._onParsedTorrent(parsedTorrent)
      })
    } else {
      // If torrentId failed to parse, it could be in a form that requires an async
      // operation, i.e. http/https link, filesystem path, or Blob.
      remote(torrentId, (err, parsedTorrent) => {
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
    this._debugId = arr2hex(parsedTorrent.infoHash).substring(0, 7)

    if (typeof this.private !== 'undefined') {
      // `private` option overrides default, only if it's defined
      parsedTorrent.private = this.private
    }

    if (this.announce) {
      // Allow specifying trackers via `opts` parameter
      parsedTorrent.announce = parsedTorrent.announce.concat(this.announce)
    }

    if (this.client.tracker && global.WEBTORRENT_ANNOUNCE && !parsedTorrent.private) {
      // So `webtorrent-hybrid` can force specific trackers to be used
      parsedTorrent.announce = parsedTorrent.announce.concat(global.WEBTORRENT_ANNOUNCE)
    }

    if (this.urlList) {
      // Allow specifying web seeds via `opts` parameter
      parsedTorrent.urlList = parsedTorrent.urlList.concat(this.urlList)
    }

    // remove duplicates by converting to Set and back
    parsedTorrent.announce = Array.from(new Set(parsedTorrent.announce))
    parsedTorrent.urlList = Array.from(new Set(parsedTorrent.urlList))

    Object.assign(this, parsedTorrent)

    this.magnetURI = toMagnetURI(parsedTorrent)
    this.torrentFile = toTorrentFile(parsedTorrent)
  }

  _onListening () {
    if (this.destroyed) return

    if (this.info) {
      // if full metadata was included in initial torrent id, use it immediately. Otherwise,
      // wait for torrent-discovery to find peers and ut_metadata to get the metadata.
      this._onMetadata(this)
    } else {
      if (this.xs) this._getMetadataFromServer()
      this._startDiscovery()
    }
  }

  _startDiscovery () {
    if (this.discovery || this.destroyed) return

    let trackerOpts = this.client.tracker
    if (trackerOpts) {
      trackerOpts = Object.assign({}, this.client.tracker, {
        getAnnounceOpts: () => {
          if (this.destroyed) return

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

    // add BEP09 peer-address
    if (this.peerAddresses) {
      this.peerAddresses.forEach(peer => this.addPeer(peer, Peer.SOURCE_MANUAL))
    }

    // begin discovering peers via DHT and trackers
    this.discovery = new Discovery({
      infoHash: this.infoHash,
      announce: this.announce,
      peerId: this.client.peerId,
      dht: !this.private && this.client.dht,
      tracker: trackerOpts,
      port: this.client.torrentPort,
      userAgent: USER_AGENT,
      lsd: this.client.lsd
    })

    this.discovery.on('error', (err) => {
      this._destroy(err)
    })

    this.discovery.on('peer', (peer, source) => {
      this._debug('peer %s discovered via %s', peer, source)
      // Don't create new outgoing TCP connections when torrent is done
      if (typeof peer === 'string' && this.done) return
      this.addPeer(peer, source)
    })

    this.discovery.on('trackerAnnounce', () => {
      this.emit('trackerAnnounce')
    })

    this.discovery.on('dhtAnnounce', () => {
      this.emit('dhtAnnounce')
    })

    this.discovery.on('warning', (err) => {
      this.emit('warning', err)
    })

    this._noPeersIntervalId = setInterval(() => {
      if (this.destroyed) return

      const counters = {
        [Peer.SOURCE_TRACKER]: {
          enabled: !!this.client.tracker,
          numPeers: 0
        },
        [Peer.SOURCE_DHT]: {
          enabled: !!this.client.dht,
          numPeers: 0
        },
        [Peer.SOURCE_LSD]: {
          enabled: !!this.client.lsd,
          numPeers: 0
        },
        [Peer.SOURCE_UT_PEX]: {
          enabled: (this.client.utPex && typeof utPex === 'function'),
          numPeers: 0
        }
      }
      for (const peer of Object.values(this._peers)) {
        const counter = counters[peer.source]
        if (typeof counter !== 'undefined') counter.numPeers++
      }
      for (const source of Object.keys(counters)) {
        const counter = counters[source]
        if (counter.enabled && counter.numPeers === 0) this.emit('noPeers', source)
      }
    }, this._noPeersIntervalTime)
    if (this._noPeersIntervalId.unref) this._noPeersIntervalId.unref()
  }

  _getMetadataFromServer () {
    // to allow function hoisting
    const self = this

    const urls = Array.isArray(this.xs) ? this.xs : [this.xs]

    self._xsRequestsController = new AbortController()

    const signal = self._xsRequestsController.signal

    const tasks = urls.map(url => cb => {
      getMetadataFromURL(url, cb)
    })
    parallel(tasks)

    async function getMetadataFromURL (url, cb) {
      if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
        self.emit('warning', new Error(`skipping non-http xs param: ${url}`))
        return cb(null)
      }

      const opts = {
        method: 'GET',
        headers: {
          'user-agent': USER_AGENT
        },
        signal
      }
      let res
      try {
        res = await fetch(url, opts)
      } catch (err) {
        self.emit('warning', new Error(`http error from xs param: ${url}`))
        return cb(null)
      }

      if (self.destroyed) return cb(null)
      if (self.metadata) return cb(null)

      if (res.status !== 200) {
        self.emit('warning', new Error(`non-200 status code ${res.status} from xs param: ${url}`))
        return cb(null)
      }
      let torrent
      try {
        torrent = new Uint8Array(await res.arrayBuffer())
      } catch (e) {
        self.emit('warning', e)
        return cb(null)
      }

      let parsedTorrent
      try {
        parsedTorrent = await parseTorrent(torrent)
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

  /**
   * Called when the full torrent metadata is received.
   */
  async _onMetadata (metadata) {
    if (this.metadata || this.destroyed) return
    this._debug('got metadata')

    this._xsRequestsController?.abort()
    this._xsRequestsController = null

    let parsedTorrent
    if (metadata && metadata.infoHash) {
      // `metadata` is a parsed torrent (from parse-torrent module)
      parsedTorrent = metadata
    } else {
      try {
        parsedTorrent = await parseTorrent(metadata)
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

    this.files = this.files.map(file => new File(this, file))

    let rawStore = this._preloadedStore
    if (!rawStore) {
      rawStore = new this._store(this.pieceLength, {
        ...this.storeOpts,
        torrent: this,
        path: this.path,
        files: this.files,
        length: this.length,
        name: this.name + ' - ' + this.infoHash.slice(0, 8),
        addUID: this.addUID,
        rootDir: this.rootDir,
        max: this._storeCacheSlots
      })
    }

    // don't use the cache if the store is already in memory
    if (this._storeCacheSlots > 0 && !(rawStore instanceof MemoryChunkStore || rawStore instanceof HybridChunkStore)) {
      rawStore = new CacheChunkStore(rawStore, {
        max: this._storeCacheSlots
      })
    }

    this.store = new ImmediateChunkStore(
      rawStore
    )

    // Select only specified files (BEP53) http://www.bittorrent.org/beps/bep_0053.html
    if (this.so && !this._startAsDeselected) {
      this.files.forEach((v, i) => {
        if (this.so.includes(i)) {
          this.files[i].select()
        }
      })
    } else {
      // start off selecting the entire torrent with low priority
      if (this.pieces.length !== 0 && !this._startAsDeselected) {
        this.select(0, this.pieces.length - 1, 0)
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

    // Emit 'metadata' before 'ready' and 'done'
    this.emit('metadata')

    // User might destroy torrent in response to 'metadata' event
    if (this.destroyed) return

    if (this.skipVerify) {
      // Skip verifying exisitng data and just assume it's correct
      this._markAllVerified()
      this._onStore()
    } else {
      const onPiecesVerified = (err) => {
        if (err) return this._destroy(err)
        this._debug('done verifying')
        this._onStore()
      }

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
            this._verifyPieces(onPiecesVerified)
          }
        })
      } else {
        this._verifyPieces(onPiecesVerified)
      }
    }
  }

  /*
   * TODO: remove this
   * Gets the last modified time of every file on disk for this torrent.
   * Only valid in Node, not in the browser.
   */
  getFileModtimes (cb) {
    const ret = []
    parallelLimit(this.files.map((file, index) => cb => {
      const filePath = this.addUID ? path.join(this.name + ' - ' + this.infoHash.slice(0, 8)) : path.join(this.path, file.path)
      fs.stat(filePath, (err, stat) => {
        if (err && err.code !== 'ENOENT') return cb(err)
        ret[index] = stat && stat.mtime.getTime()
        cb(null)
      })
    }), FILESYSTEM_CONCURRENCY, err => {
      this._debug('done getting file modtimes')
      cb(err, ret)
    })
  }

  _verifyPieces (cb) {
    parallelLimit(this.pieces.map((piece, index) => cb => {
      if (this.destroyed) return cb(new Error('torrent is destroyed'))

      const getOpts = {}
      // Specify length for the last piece in case it is zero-padded
      if (index === this.pieces.length - 1) {
        getOpts.length = this.lastPieceLength
      }
      this.store.get(index, getOpts, async (err, buf) => {
        if (this.destroyed) return cb(new Error('torrent is destroyed'))

        if (err) return queueMicrotask(() => cb(null)) // ignore error

        const hex = await hash(buf, 'hex')
        if (this.destroyed) return cb(new Error('torrent is destroyed'))

        if (hex === this._hashes[index]) {
          this._debug('piece verified %s', index)
          this._markVerified(index)
        } else {
          this._markUnverified(index)
          this._debug('piece invalid %s', index)
        }
        cb(null)
      })
    }), FILESYSTEM_CONCURRENCY, cb)
  }

  rescanFiles (cb) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!cb) cb = noop

    this._verifyPieces((err) => {
      if (err) {
        this._destroy(err)
        return cb(err)
      }

      this._checkDone()
      cb(null)
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
    this.emit('verified', index)
  }

  _markUnverified (index) {
    const len = (index === this.pieces.length - 1)
      ? this.lastPieceLength
      : this.pieceLength
    this.pieces[index] = new Piece(len)
    this.bitfield.set(index, false)
    if (!this._startAsDeselected) this.select(index, index, 1)
    this.files.forEach(file => {
      if (file.done && file.includes(index)) file.done = false
    })
  }

  _hasAllPieces () {
    for (let index = 0; index < this.pieces.length; index++) {
      if (!this.bitfield.get(index)) return false
    }
    return true
  }

  _hasNoPieces () {
    return !this._hasMorePieces(0)
  }

  _hasMorePieces (threshold) {
    let count = 0
    for (let index = 0; index < this.pieces.length; index++) {
      if (this.bitfield.get(index)) {
        count += 1
        if (count > threshold) return true
      }
    }
    return false
  }

  /**
   * Called when the metadata, listening server, and underlying chunk store is initialized.
   */
  _onStore () {
    if (this.destroyed) return
    this._debug('on store')

    // Start discovery before emitting 'ready'
    this._startDiscovery()

    this.ready = true
    this.emit('ready')

    // Files may start out done if the file was already in the store
    this._checkDone()

    // In case any selections were made before torrent was ready
    this._updateSelections()

    // Start requesting pieces after we have initially verified them
    this.wires.forEach(wire => {
      // If we didn't have the metadata at the time ut_metadata was initialized for this
      // wire, we still want to make it available to the peer in case they request it.
      if (wire.ut_metadata) wire.ut_metadata.setMetadata(this.metadata)

      this._onWireWithMetadata(wire)
    })
  }

  destroy (opts, cb) {
    if (typeof opts === 'function') return this.destroy(null, opts)

    this._destroy(null, opts, cb)
  }

  _destroy (err, opts, cb) {
    if (typeof opts === 'function') return this._destroy(err, null, opts)
    if (this.destroyed) return
    this.destroyed = true
    this._debug('destroy')

    this.client._remove(this)

    this._selections.clear()

    clearInterval(this._rechokeIntervalId)

    clearInterval(this._noPeersIntervalId)

    this._xsRequestsController?.abort()

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
      let destroyStore = this._destroyStoreOnDestroy
      if (opts && opts.destroyStore !== undefined) {
        destroyStore = opts.destroyStore
      }
      tasks.push(cb => {
        if (destroyStore) {
          this.store.destroy(cb)
        } else {
          this.store.close(cb)
        }
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

  addPeer (peer, source) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!this.infoHash) throw new Error('addPeer() must not be called before the `infoHash` event')

    let host

    if (this.client.blocked) {
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

    // if the utp connection fails to connect, then it is replaced with a tcp connection to the same ip:port

    const type = (this.client.utp && this._isIPv4(host)) ? 'utp' : 'tcp'
    const wasAdded = !!this._addPeer(peer, type, source)

    if (wasAdded) {
      this.emit('peer', peer)
    } else {
      this.emit('invalidPeer', peer)
    }
    return wasAdded
  }

  _addPeer (peer, type, source) {
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
      newPeer = type === 'utp'
        ? Peer.createUTPOutgoingPeer(peer, this, this.client.throttleGroups)
        : Peer.createTCPOutgoingPeer(peer, this, this.client.throttleGroups)
    } else {
      // `peer` is a WebRTC connection (simple-peer)
      newPeer = Peer.createWebRTCPeer(peer, this, this.client.throttleGroups)
    }

    this._registerPeer(newPeer)

    if (typeof peer === 'string') {
      // `peer` is an addr ("ip:port" string)
      this._queue.push(newPeer)
      this._drain()
    }

    return newPeer
  }

  addWebSeed (urlOrConn) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    let id
    let conn
    if (typeof urlOrConn === 'string') {
      id = urlOrConn

      if (!/^https?:\/\/.+/.test(id)) {
        this.emit('warning', new Error(`ignoring invalid web seed: ${id}`))
        this.emit('invalidPeer', id)
        return
      }

      if (this._peers[id]) {
        this.emit('warning', new Error(`ignoring duplicate web seed: ${id}`))
        this.emit('invalidPeer', id)
        return
      }

      conn = new WebConn(id, this)
    } else if (urlOrConn && typeof urlOrConn.connId === 'string') {
      conn = urlOrConn
      id = conn.connId

      if (this._peers[id]) {
        this.emit('warning', new Error(`ignoring duplicate web seed: ${id}`))
        this.emit('invalidPeer', id)
        return
      }
    } else {
      this.emit('warning', new Error('addWebSeed must be passed a string or connection object with id property'))
      return
    }

    this._debug('add web seed %s', id)

    const newPeer = Peer.createWebSeedPeer(conn, id, this, this.client.throttleGroups)

    this._registerPeer(newPeer)

    this.emit('peer', id)
  }

  /**
   * Called whenever a new incoming TCP peer connects to this torrent swarm. Called with a
   * peer that has already sent a handshake.
   */
  _addIncomingPeer (peer) {
    if (this.destroyed) return peer.destroy(new Error('torrent is destroyed'))
    if (this.paused) return peer.destroy(new Error('torrent is paused'))

    this._debug('add incoming peer %s', peer.id)

    this._registerPeer(peer)
  }

  _registerPeer (newPeer) {
    newPeer.on('download', downloaded => {
      if (this.destroyed) return
      this.received += downloaded
      this._downloadSpeed(downloaded)
      this.client._downloadSpeed(downloaded)
      this.emit('download', downloaded)
      if (this.destroyed) return
      this.client.emit('download', downloaded)
    })

    newPeer.on('upload', uploaded => {
      if (this.destroyed) return
      this.uploaded += uploaded
      this._uploadSpeed(uploaded)
      this.client._uploadSpeed(uploaded)
      this.emit('upload', uploaded)
      if (this.destroyed) return
      this.client.emit('upload', uploaded)
    })

    this._peers[newPeer.id] = newPeer
    this._peersLength += 1
  }

  removePeer (peer) {
    const id = peer?.id || peer
    if (peer && !peer.id) peer = this._peers?.[id]

    if (!peer) return
    peer.destroy()

    if (this.destroyed) return

    this._debug('removePeer %s', id)

    delete this._peers[id]
    this._peersLength -= 1

    // If torrent swarm was at capacity before, try to open a new connection now
    this._drain()
  }

  _select (start, end, priority, notify, isStreamSelection = false) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    if (start < 0 || end < start || this.pieces.length <= end) {
      throw new Error(`invalid selection ${start} : ${end}`)
    }
    priority = Number(priority) || 0

    this._debug('select %s-%s (priority %s)', start, end, priority)

    this._selections.insert({
      from: start,
      to: end,
      offset: 0,
      priority,
      notify,
      isStreamSelection
    })

    this._selections.sort((a, b) => b.priority - a.priority)

    this._updateSelections()
  }

  select (start, end, priority, notify) {
    this._select(start, end, priority, notify, false)
  }

  _deselect (from, to, isStreamSelection = false) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    this._debug('deselect %s-%s', from, to)

    this._selections.remove({ from, to, isStreamSelection })

    this._updateSelections()
  }

  deselect (start, end) {
    this._deselect(start, end, false)
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
    if (wire.type !== 'webSeed') { // webseeds always send 'unhave' on http timeout
      wire.setTimeout(PIECE_TIMEOUT, true)
    }

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
    if (this.client.utPex && typeof utPex === 'function' && !this.private) {
      wire.use(utPex())

      wire.ut_pex.on('peer', peer => {
        // Only add potential new peers when we're not seeding
        if (this.done) return
        this._debug('ut_pex: got peer: %s (from %s)', peer, addr)
        this.addPeer(peer, Peer.SOURCE_UT_PEX)
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

    wire.use(ltDontHave())

    // Hook to allow user-defined `bittorrent-protocol` extensions
    // More info: https://github.com/webtorrent/bittorrent-protocol#extension-api
    this.emit('wire', wire, addr)

    if (this.ready) {
      queueMicrotask(() => {
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
      if (this.alwaysChokeSeeders) wire.choke() // always choke seeders
    }

    wire.on('bitfield', () => {
      updateSeedStatus()
      this._update()
      this._updateWireInterest(wire)
    })

    wire.on('have', () => {
      updateSeedStatus()
      this._update()
      this._updateWireInterest(wire)
    })

    wire.lt_donthave.on('donthave', () => {
      updateSeedStatus()
      this._update()
      this._updateWireInterest(wire)
    })

    // fast extension (BEP6)
    wire.on('have-all', () => {
      wire.isSeeder = true
      if (this.alwaysChokeSeeders) wire.choke() // always choke seeders
      this._update()
      this._updateWireInterest(wire)
    })

    // fast extension (BEP6)
    wire.on('have-none', () => {
      wire.isSeeder = false
      this._update()
      this._updateWireInterest(wire)
    })

    // fast extension (BEP6)
    wire.on('allowed-fast', (index) => {
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

    // always send bitfield or equivalent fast extension message (required)
    if (wire.hasFast && this._hasAllPieces()) wire.haveAll()
    else if (wire.hasFast && this._hasNoPieces()) wire.haveNone()
    else wire.bitfield(this.bitfield)

    // initialize interest in case bitfield message was already received before above handler was registered
    this._updateWireInterest(wire)

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

    queueMicrotask(() => {
      this._gcSelections()
    })
    this._updateInterest()
    this._update()
  }

  /**
   * Garbage collect selections with respect to the store's current state.
   */
  _gcSelections () {
    for (const s of this._selections) {
      const oldOffset = s.offset

      // check for newly downloaded pieces in selection
      while (this.bitfield.get(s.from + s.offset) && s.from + s.offset < s.to) {
        s.offset += 1
      }

      if (oldOffset !== s.offset) s.notify?.()
      if (s.to !== s.from + s.offset) continue
      if (!this.bitfield.get(s.from + s.offset)) continue

      s.remove() // remove fully downloaded selection
      s.notify?.()
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

    this.wires.forEach(wire => this._updateWireInterest(wire))

    if (prev === this._amInterested) return
    if (this._amInterested) this.emit('interested')
    else this.emit('uninterested')
  }

  _updateWireInterest (wire) {
    let interested = false
    for (let index = 0; index < this.pieces.length; ++index) {
      if (this.pieces[index] && wire.peerPieces.get(index)) {
        interested = true
        break
      }
    }

    if (interested) wire.interested()
    else wire.uninterested()
  }

  /**
   * Heartbeat to update all peers and their requests.
   */
  _update () {
    if (IDLE_CALLBACK) {
      IDLE_CALLBACK(() => this._updateWireWrapper(), { timeout: 250 })
    } else {
      this._updateWireWrapper()
    }
  }

  _updateWireWrapper () {
    if (this.destroyed) return
    // update wires in random order for better request distribution
    const ite = randomIterate(this.wires)
    let wire
    while ((wire = ite())) {
      this._updateWire(wire)
    }
  }

  /**
   * Attempts to update a peer's requests
   */
  _updateWire (wire) {
    if (wire.destroyed) return false
    // to allow function hoisting
    const self = this

    const minOutstandingRequests = getBlockPipelineLength(wire, PIPELINE_MIN_DURATION)
    if (wire.requests.length >= minOutstandingRequests) return
    const maxOutstandingRequests = getBlockPipelineLength(wire, PIPELINE_MAX_DURATION)

    if (wire.peerChoking) {
      if (wire.hasFast && wire.peerAllowedFastSet.length > 0 &&
        !this._hasMorePieces(wire.peerAllowedFastSet.length - 1)) {
        requestAllowedFastSet()
      }
      return
    }

    if (!wire.downloaded) return validateWire()

    trySelectWire(false) || trySelectWire(true)

    function requestAllowedFastSet () {
      if (wire.requests.length >= maxOutstandingRequests) return false

      for (const piece of wire.peerAllowedFastSet) {
        if (wire.peerPieces.get(piece) && !self.bitfield.get(piece)) {
          while (self._request(wire, piece, false) &&
            wire.requests.length < maxOutstandingRequests) {
            // body intentionally empty
            // request all non-reserved blocks in this piece
          }
        }

        if (wire.requests.length < maxOutstandingRequests) continue

        return true
      }

      return false
    }

    function genPieceFilterFunc (start, end, tried, rank) {
      return i => i >= start && i <= end && !(i in tried) && wire.peerPieces.get(i) && (!rank || rank(i))
    }

    // TODO: Do we need both validateWire and trySelectWire?
    function validateWire () {
      if (wire.requests.length) return

      let i = self._selections.length
      while (i--) {
        const next = self._selections.get(i)
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
      for (let j = i; j < self._selections.length && self._selections.get(j).priority; j++) {
        last = j
      }
      self._selections.swap(i, last)
    }

    function trySelectWire (hotswap) {
      if (wire.requests.length >= maxOutstandingRequests) return true
      const rank = speedRanker()

      for (let i = 0; i < self._selections.length; i++) {
        const next = self._selections.get(i)

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

            while (self._request(wire, piece, self._critical[piece] || hotswap) &&
              wire.requests.length < maxOutstandingRequests) {
              // body intentionally empty
              // request all non-reserved blocks in this piece
            }

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

            while (self._request(wire, piece, self._critical[piece] || hotswap) &&
              wire.requests.length < maxOutstandingRequests) {
              // body intentionally empty
              // request all non-reserved blocks in piece
            }

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

    // wires in increasing order of quality (pop() gives next best peer)
    const wireStack =
      this.wires
        .map(wire => ({ wire, random: Math.random() })) // insert a random seed for randomizing the sort
        .sort((objA, objB) => {
          const wireA = objA.wire
          const wireB = objB.wire

          // prefer peers that send us data faster
          if (wireA.downloadSpeed() !== wireB.downloadSpeed()) {
            return wireA.downloadSpeed() - wireB.downloadSpeed()
          }

          // then prefer peers that can download data from us faster
          if (wireA.uploadSpeed() !== wireB.uploadSpeed()) {
            return wireA.uploadSpeed() - wireB.uploadSpeed()
          }

          // then prefer already unchoked peers (to minimize fibrillation)
          if (wireA.amChoking !== wireB.amChoking) {
            return wireA.amChoking ? -1 : 1 // choking < unchoked
          }

          // otherwise random order
          return objA.random - objB.random
        })
        .map(obj => obj.wire) // return array of wires (remove random seed)

    if (this._rechokeOptimisticTime <= 0) {
      // clear old optimistic peer, so it can be rechoked normally and then replaced
      this._rechokeOptimisticWire = null
    } else {
      this._rechokeOptimisticTime -= 1
    }

    let numInterestedUnchoked = 0
    // leave one rechoke slot open for optimistic unchoking
    while (wireStack.length > 0 && numInterestedUnchoked < this._rechokeNumSlots - 1) {
      const wire = wireStack.pop() // next best quality peer

      if (wire.isSeeder || wire === this._rechokeOptimisticWire) {
        continue
      }

      wire.unchoke()

      // only stop unchoking once we fill the slots with interested peers that will actually download
      if (wire.peerInterested) {
        numInterestedUnchoked++
      }
    }

    // fill optimistic unchoke slot if empty
    if (this._rechokeOptimisticWire === null && this._rechokeNumSlots > 0) {
      // don't optimistically unchoke uninterested peers
      const remaining = wireStack.filter(wire => wire.peerInterested)

      if (remaining.length > 0) {
        // select random remaining (not yet unchoked) peer
        const newOptimisticPeer = remaining[randomInt(remaining.length)]

        newOptimisticPeer.unchoke()

        this._rechokeOptimisticWire = newOptimisticPeer

        this._rechokeOptimisticTime = RECHOKE_OPTIMISTIC_DURATION
      }
    }

    // choke the rest
    wireStack
      .filter(wire => wire !== this._rechokeOptimisticWire) // except the optimistically unchoked peer
      .forEach(wire => wire.choke())
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

    wire.request(index, chunkOffset, chunkLength, async function onChunk (err, chunk) {
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

      const hex = await hash(buf, 'hex')
      if (self.destroyed) return

      if (hex === self._hashes[index]) {
        self._debug('piece verified %s', index)

        self.store.put(index, buf, err => {
          if (err) {
            self._destroy(err)
            return
          } else {
            self.pieces[index] = null
            self._markVerified(index)
            self.wires.forEach(wire => {
              wire.have(index)
            })
          }
          // We also check `self.destroyed` since `torrent.destroy()` could have been
          // called in the `torrent.on('done')` handler, triggered by `_checkDone()`.
          if (self._checkDone() && !self.destroyed) self.discovery.complete()
          onUpdateTick()
        })
      } else {
        self.pieces[index] = new Piece(piece.length)
        self.emit('warning', new Error(`Piece ${index} failed verification`))
        onUpdateTick()
      }
    })

    function onUpdateTick () {
      queueMicrotask(() => { self._update() })
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

    for (const selection of this._selections) {
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
    } else {
      this.done = false
    }
    this._gcSelections()

    return done
  }

  async load (streams, cb) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!this.ready) return this.once('ready', () => { this.load(streams, cb) })

    if (!Array.isArray(streams)) streams = [streams]
    if (!cb) cb = noop

    try {
      await chunkStoreWrite(this.store, joinIterator(streams), { chunkLength: this.pieceLength })
      this._markAllVerified()
      this._checkDone()
      cb(null)
    } catch (err) {
      cb(err)
      return err
    }
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
    args[0] = `[${this.client ? this.client._debugId : 'No Client'}] [${this._debugId}] ${args[0]}`
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

    this._debug('%s connect attempt to %s', peer.type, peer.addr)

    const parts = addrToIPPort(peer.addr)
    const opts = {
      host: parts[0],
      port: parts[1]
    }

    if (this.client.utp && peer.type === Peer.TYPE_UTP_OUTGOING) {
      peer.conn = utp.connect(opts.port, opts.host)
    } else {
      peer.conn = net.connect(opts)
    }

    const conn = peer.conn

    conn.once('connect', () => { if (!this.destroyed) peer.onConnect() })
    conn.once('error', err => { peer.destroy(err) })
    peer.startConnectTimeout()

    // When connection closes, attempt reconnect after timeout (with exponential backoff)
    conn.on('close', () => {
      if (this.destroyed) return

      if (peer.retries >= RECONNECT_WAIT.length) {
        if (this.client.utp) {
          const newPeer = this._addPeer(peer.addr, 'tcp', peer.source)
          if (newPeer) newPeer.retries = 0
        } else {
          this._debug(
            'conn %s closed: will not re-add (max %s attempts)',
            peer.addr, RECONNECT_WAIT.length
          )
        }
        return
      }

      const ms = RECONNECT_WAIT[peer.retries]
      this._debug(
        'conn %s closed: will re-add to queue in %sms (attempt %s)',
        peer.addr, ms, peer.retries + 1
      )

      const reconnectTimeout = setTimeout(() => {
        if (this.destroyed) return
        const host = addrToIPPort(peer.addr)[0]
        const type = (this.client.utp && this._isIPv4(host)) ? 'utp' : 'tcp'
        const newPeer = this._addPeer(peer.addr, type, peer.source)
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

  /**
   * Return `true` if string is a valid IPv4 address.
   * @param {string} addr
   * @return {boolean}
   */
  _isIPv4 (addr) {
    const IPv4Pattern = /^((?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])[.]){3}(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$/
    return IPv4Pattern.test(addr)
  }
}

function getBlockPipelineLength (wire, duration) {
  let length = 2 + Math.ceil(duration * wire.downloadSpeed() / Piece.BLOCK_LENGTH)

  // Honor reqq (maximum number of outstanding request messages) if specified by peer
  if (wire.peerExtendedHandshake) {
    const reqq = wire.peerExtendedHandshake.reqq
    if (typeof reqq === 'number' && reqq > 0) {
      length = Math.min(length, reqq)
    }
  }

  return length
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
