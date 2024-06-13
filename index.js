/*! webtorrent. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */
import EventEmitter from 'events'
import path from 'path'
import createTorrent, { parseInput } from 'create-torrent'
import debugFactory from 'debug'
import { Client as DHT } from 'bittorrent-dht' // browser exclude
import loadIPSet from 'load-ip-set' // browser exclude
import parallel from 'run-parallel'
import parseTorrent from 'parse-torrent'
import Peer from '@thaunknown/simple-peer/lite.js'
import queueMicrotask from 'queue-microtask'
import { hash, hex2arr, arr2hex, arr2base, text2arr, randomBytes, concat } from 'uint8-util'
import throughput from 'throughput'
import { ThrottleGroup } from 'speed-limiter'
import NatAPI from '@silentbot1/nat-api' // browser exclude
import ConnPool from './lib/conn-pool.js' // browser exclude
import Torrent from './lib/torrent.js'
import { NodeServer, BrowserServer } from './lib/server.js'

import VERSION from './version.cjs'

const debug = debugFactory('webtorrent')

/**
 * Version number in Azureus-style. Generated from major and minor semver version.
 * For example:
 *   '0.16.1' -> '0016'
 *   '1.2.5' -> '0102'
 */
const VERSION_STR = VERSION
  .replace(/\d*./g, v => `0${v % 100}`.slice(-2))
  .slice(0, 4)

/**
 * Version prefix string (used in peer ID). WebTorrent uses the Azureus-style
 * encoding: '-', two characters for client id ('WW'), four ascii digits for version
 * number, '-', followed by random numbers.
 * For example:
 *   '-WW0102-'...
 */
const VERSION_PREFIX = `-WW${VERSION_STR}-`

/**
 * WebTorrent Client
 * @param {Object=} opts
 */
export default class WebTorrent extends EventEmitter {
  constructor (opts = {}) {
    super()

    if (typeof opts.peerId === 'string') {
      this.peerId = opts.peerId
    } else if (ArrayBuffer.isView(opts.peerId)) {
      this.peerId = arr2hex(opts.peerId)
    } else {
      this.peerId = arr2hex(text2arr(VERSION_PREFIX + arr2base(randomBytes(9))))
    }
    this.peerIdBuffer = hex2arr(this.peerId)

    if (typeof opts.nodeId === 'string') {
      this.nodeId = opts.nodeId
    } else if (ArrayBuffer.isView(opts.nodeId)) {
      this.nodeId = arr2hex(opts.nodeId)
    } else {
      this.nodeId = arr2hex(randomBytes(20))
    }
    this.nodeIdBuffer = hex2arr(this.nodeId)

    this._debugId = this.peerId.substring(0, 7)

    this.destroyed = false
    this.listening = false
    this.torrentPort = opts.torrentPort || 0
    this.dhtPort = opts.dhtPort || 0
    this.tracker = opts.tracker !== undefined ? opts.tracker : {}
    this.lsd = opts.lsd !== false
    this.utPex = opts.utPex !== false
    this.natUpnp = opts.natUpnp ?? true
    this.natPmp = opts.natPmp ?? true
    this.torrents = []
    this.maxConns = Number(opts.maxConns) || 55
    this.utp = WebTorrent.UTP_SUPPORT && opts.utp !== false
    this.seedOutgoingConnections = opts.seedOutgoingConnections ?? true

    this._downloadLimit = Math.max((typeof opts.downloadLimit === 'number') ? opts.downloadLimit : -1, -1)
    this._uploadLimit = Math.max((typeof opts.uploadLimit === 'number') ? opts.uploadLimit : -1, -1)

    if ((this.natUpnp || this.natPmp) && typeof NatAPI === 'function') {
      this.natTraversal = new NatAPI({
        enableUPNP: this.natUpnp,
        enablePMP: this.natPmp,
        upnpPermanentFallback: opts.natUpnp === 'permanent'
      })
    }

    if (opts.secure === true) {
      import('./lib/peer.js').then(({ enableSecure }) => enableSecure())
    }

    this._debug(
      'new webtorrent (peerId %s, nodeId %s, port %s)',
      this.peerId, this.nodeId, this.torrentPort
    )

    this.throttleGroups = {
      down: new ThrottleGroup({ rate: Math.max(this._downloadLimit, 0), enabled: this._downloadLimit >= 0 }),
      up: new ThrottleGroup({ rate: Math.max(this._uploadLimit, 0), enabled: this._uploadLimit >= 0 })
    }

    if (this.tracker) {
      if (typeof this.tracker !== 'object') this.tracker = {}
      if (globalThis.WRTC && !this.tracker.wrtc) this.tracker.wrtc = globalThis.WRTC
    }

    if (typeof ConnPool === 'function') {
      this._connPool = new ConnPool(this)
    } else {
      queueMicrotask(() => {
        this._onListening()
      })
    }

    // stats
    this._downloadSpeed = throughput()
    this._uploadSpeed = throughput()

    if (opts.dht !== false && typeof DHT === 'function' /* browser exclude */) {
      // use a single DHT instance for all torrents, so the routing table can be reused
      this.dht = new DHT(Object.assign({}, { nodeId: this.nodeId }, opts.dht))

      this.dht.once('error', err => {
        this._destroy(err)
      })

      this.dht.once('listening', () => {
        const address = this.dht.address()
        if (address) {
          this.dhtPort = address.port
          if (this.natTraversal) {
            this.natTraversal.map({
              publicPort: this.dhtPort,
              privatePort: this.dhtPort,
              protocol: 'udp',
              description: 'WebTorrent DHT'
            }).catch(err => {
              debug('error mapping DHT port via UPnP/PMP: %o', err)
            })
          }
        }
      })

      // Ignore warning when there are > 10 torrents in the client
      this.dht.setMaxListeners(0)

      this.dht.listen(this.dhtPort)
    } else {
      this.dht = false
    }

    // Enable or disable BEP19 (Web Seeds). Enabled by default:
    this.enableWebSeeds = opts.webSeeds !== false

    const ready = () => {
      if (this.destroyed) return
      this.ready = true
      this.emit('ready')
    }

    if (typeof loadIPSet === 'function' && opts.blocklist != null) {
      loadIPSet(opts.blocklist, {
        headers: {
          'user-agent': `WebTorrent/${VERSION} (https://webtorrent.io)`
        }
      }, (err, ipSet) => {
        if (err) return console.error(`Failed to load blocklist: ${err.message}`)
        this.blocked = ipSet
        ready()
      })
    } else {
      queueMicrotask(ready)
    }
  }

  /**
   * Creates an http server to serve the contents of this torrent,
   * dynamically fetching the needed torrent pieces to satisfy http requests.
   * Range requests are supported.
   *
   * @param {Object} options
   * @param {String} force
   * @return {BrowserServer||NodeServer}
   */
  createServer (options, force) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (this._server) throw new Error('server already created')
    if ((typeof window === 'undefined' || force === 'node') && force !== 'browser') {
      // node implementation
      this._server = new NodeServer(this, options)
      return this._server
    } else {
      // browser implementation
      if (!(options?.controller instanceof ServiceWorkerRegistration)) throw new Error('Invalid worker registration')
      if (options.controller.active.state !== 'activated') throw new Error('Worker isn\'t activated')
      this._server = new BrowserServer(this, options)
      return this._server
    }
  }

  get downloadSpeed () { return this._downloadSpeed() }

  get uploadSpeed () { return this._uploadSpeed() }

  get progress () {
    const torrents = this.torrents.filter(torrent => torrent.progress !== 1)
    const downloaded = torrents.reduce((total, torrent) => total + torrent.downloaded, 0)
    const length = torrents.reduce((total, torrent) => total + (torrent.length || 0), 0) || 1
    return downloaded / length
  }

  get ratio () {
    const uploaded = this.torrents.reduce((total, torrent) => total + torrent.uploaded, 0)
    const received = this.torrents.reduce((total, torrent) => total + torrent.received, 0) || 1
    return uploaded / received
  }

  /**
   * Returns the torrent with the given `torrentId`. Convenience method. Easier than
   * searching through the `client.torrents` array. Returns `null` if no matching torrent
   * found.
   *
   * @param  {string|Buffer|Object|Torrent} torrentId
   * @return {Promise<Torrent|null>}
   */
  async get (torrentId) {
    if (torrentId instanceof Torrent) {
      if (this.torrents.includes(torrentId)) return torrentId
    } else {
      const torrents = this.torrents
      let parsed
      try { parsed = await parseTorrent(torrentId) } catch (err) {}
      if (!parsed) return null
      if (!parsed.infoHash) throw new Error('Invalid torrent identifier')

      for (const torrent of torrents) {
        if (torrent.infoHash === parsed.infoHash) return torrent
      }
    }
    return null
  }

  /**
   * Start downloading a new torrent. Aliased as `client.download`.
   * @param {string|Buffer|Object} torrentId
   * @param {Object} opts torrent-specific options
   * @param {function=} ontorrent called when the torrent is ready (has metadata)
   */
  add (torrentId, opts = {}, ontorrent = () => {}) {
    if (this.destroyed) throw new Error('client is destroyed')
    if (typeof opts === 'function') [opts, ontorrent] = [{}, opts]

    const onInfoHash = () => {
      if (this.destroyed) return
      for (const t of this.torrents) {
        if (t.infoHash === torrent.infoHash && t !== torrent) {
          torrent._destroy(new Error(`Cannot add duplicate torrent ${torrent.infoHash}`))
          ontorrent(t)
          return
        }
      }
    }

    const onReady = () => {
      if (this.destroyed) return
      ontorrent(torrent)
      this.emit('torrent', torrent)
    }

    function onClose () {
      torrent.removeListener('_infoHash', onInfoHash)
      torrent.removeListener('ready', onReady)
      torrent.removeListener('close', onClose)
    }

    this._debug('add')
    opts = opts ? Object.assign({}, opts) : {}

    const torrent = new Torrent(torrentId, this, opts)
    this.torrents.push(torrent)

    torrent.once('_infoHash', onInfoHash)
    torrent.once('ready', onReady)
    torrent.once('close', onClose)

    this.emit('add', torrent)
    return torrent
  }

  /**
   * Start seeding a new file/folder.
   * @param  {string|File|FileList|Buffer|Array.<string|File|Buffer>} input
   * @param  {Object=} opts
   * @param  {function=} onseed called when torrent is seeding
   */
  seed (input, opts, onseed) {
    if (this.destroyed) throw new Error('client is destroyed')
    if (typeof opts === 'function') [opts, onseed] = [{}, opts]

    this._debug('seed')
    opts = opts ? Object.assign({}, opts) : {}

    // no need to verify the hashes we create
    opts.skipVerify = true

    const isFilePath = typeof input === 'string'

    // When seeding from fs path, initialize store from that path to avoid a copy
    if (isFilePath) opts.path = path.dirname(input)
    if (!opts.createdBy) opts.createdBy = `WebTorrent/${VERSION_STR}`

    const onTorrent = torrent => {
      const tasks = [
        cb => {
          // when a filesystem path is specified or the store is preloaded, files are already in the FS store
          if (isFilePath || opts.preloadedStore) return cb()
          torrent.load(streams, cb)
        }
      ]
      if (this.dht) {
        tasks.push(cb => {
          torrent.once('dhtAnnounce', cb)
        })
      }
      parallel(tasks, err => {
        if (this.destroyed) return
        if (err) return torrent._destroy(err)
        _onseed(torrent)
      })
    }

    const _onseed = torrent => {
      this._debug('on seed')
      if (typeof onseed === 'function') onseed(torrent)
      torrent.emit('seed')
      this.emit('seed', torrent)
    }

    const torrent = this.add(null, opts, onTorrent)
    let streams

    if (isFileList(input)) input = Array.from(input)
    else if (!Array.isArray(input)) input = [input]

    parallel(input.map(item => async cb => {
      if (!opts.preloadedStore && isReadable(item)) {
        const chunks = []
        try {
          for await (const chunk of item) {
            chunks.push(chunk)
          }
        } catch (err) {
          return cb(err)
        }
        const buf = concat(chunks)
        buf.name = item.name
        cb(null, buf)
      } else {
        cb(null, item)
      }
    }), (err, input) => {
      if (this.destroyed) return
      if (err) return torrent._destroy(err)

      parseInput(input, opts, (err, files) => {
        if (this.destroyed) return
        if (err) return torrent._destroy(err)

        streams = files.map(file => file.getStream)

        createTorrent(input, opts, async (err, torrentBuf) => {
          if (this.destroyed) return
          if (err) return torrent._destroy(err)

          const existingTorrent = await this.get(torrentBuf)
          if (existingTorrent) {
            console.warn('A torrent with the same id is already being seeded')
            torrent._destroy()
            if (typeof onseed === 'function') onseed(existingTorrent)
          } else {
            torrent._onTorrentId(torrentBuf)
          }
        })
      })
    })

    return torrent
  }

  /**
   * Remove a torrent from the client.
   * @param  {string|Buffer|Torrent}   torrentId
   * @param  {function} cb
   */
  async remove (torrentId, opts, cb) {
    if (typeof opts === 'function') return this.remove(torrentId, null, opts)

    this._debug('remove')
    const torrent = await this.get(torrentId)
    if (!torrent) throw new Error(`No torrent with id ${torrentId}`)
    this._remove(torrent, opts, cb)
  }

  _remove (torrent, opts, cb) {
    if (!torrent) return
    if (typeof opts === 'function') return this._remove(torrent, null, opts)
    const index = this.torrents.indexOf(torrent)
    if (index === -1) return
    this.torrents.splice(index, 1)
    torrent.destroy(opts, cb)
    if (this.dht) {
      this.dht._tables.remove(torrent.infoHash)
    }
    this.emit('remove', torrent)
  }

  address () {
    if (!this.listening) return null
    return this._connPool
      ? this._connPool.tcpServer.address()
      : { address: '0.0.0.0', family: 'IPv4', port: 0 }
  }

  /**
   * Set global download throttle rate.
   * @param  {Number} rate (must be bigger or equal than zero, or -1 to disable throttling)
   */
  throttleDownload (rate) {
    rate = Number(rate)
    if (isNaN(rate) || !isFinite(rate) || rate < -1) return false
    this._downloadLimit = rate
    if (this._downloadLimit < 0) return this.throttleGroups.down.setEnabled(false)
    this.throttleGroups.down.setEnabled(true)
    this.throttleGroups.down.setRate(this._downloadLimit)
  }

  /**
   * Set global upload throttle rate
   * @param  {Number} rate (must be bigger or equal than zero, or -1 to disable throttling)
   */
  throttleUpload (rate) {
    rate = Number(rate)
    if (isNaN(rate) || !isFinite(rate) || rate < -1) return false
    this._uploadLimit = rate
    if (this._uploadLimit < 0) return this.throttleGroups.up.setEnabled(false)
    this.throttleGroups.up.setEnabled(true)
    this.throttleGroups.up.setRate(this._uploadLimit)
  }

  /**
   * Destroy the client, including all torrents and connections to peers.
   * @param  {function} cb
   */
  destroy (cb) {
    if (this.destroyed) throw new Error('client already destroyed')
    this._destroy(null, cb)
  }

  _destroy (err, cb) {
    this._debug('client destroy')
    this.destroyed = true

    const tasks = this.torrents.map(torrent => cb => {
      torrent.destroy(cb)
    })

    if (this._connPool) {
      tasks.push(cb => {
        this._connPool.destroy(cb)
      })
    }

    if (this.dht) {
      tasks.push(cb => {
        this.dht.destroy(cb)
      })
    }

    if (this._server) {
      tasks.push(cb => {
        this._server.destroy(cb)
      })
    }

    if (this.natTraversal) {
      tasks.push(cb => {
        this.natTraversal.destroy()
          .then(() => cb())
      })
    }

    parallel(tasks, cb)

    if (err) this.emit('error', err)

    this.torrents = []
    this._connPool = null
    this.dht = null

    this.throttleGroups.down.destroy()
    this.throttleGroups.up.destroy()
  }

  _onListening () {
    this._debug('listening')
    this.listening = true

    if (this._connPool) {
      // Sometimes server.address() returns `null` in Docker.
      const address = this._connPool.tcpServer.address()
      if (address) {
        this.torrentPort = address.port
        if (this.natTraversal) {
          this.natTraversal.map({
            publicPort: this.torrentPort,
            privatePort: this.torrentPort,
            protocol: this.utp ? null : 'tcp',
            description: 'WebTorrent Torrent'
          }).catch(err => {
            debug('error mapping WebTorrent port via UPnP/PMP: %o', err)
          })
        }
      }
    }

    this.emit('listening')
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = `[${this._debugId}] ${args[0]}`
    debug(...args)
  }

  async _getByHash (infoHashHash) {
    for (const torrent of this.torrents) {
      if (!torrent.infoHashHash) {
        torrent.infoHashHash = await hash(hex2arr('72657132' /* 'req2' */ + torrent.infoHash), 'hex')
      }
      if (infoHashHash === torrent.infoHashHash) {
        return torrent
      }
    }

    return null
  }
}

WebTorrent.WEBRTC_SUPPORT = Peer.WEBRTC_SUPPORT
WebTorrent.UTP_SUPPORT = ConnPool.UTP_SUPPORT
WebTorrent.VERSION = VERSION

/**
 * Check if `obj` is a node Readable stream
 * @param  {*} obj
 * @return {boolean}
 */
function isReadable (obj) {
  return typeof obj === 'object' && obj != null && typeof obj.pipe === 'function'
}

/**
 * Check if `obj` is a W3C `FileList` object
 * @param  {*} obj
 * @return {boolean}
 */
function isFileList (obj) {
  return typeof FileList !== 'undefined' && obj instanceof FileList
}
