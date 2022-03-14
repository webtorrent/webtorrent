/*! webtorrent. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */
/* global FileList, ServiceWorker */
/* eslint-env browser */

const EventEmitter = require('events')
const path = require('path')
const concat = require('simple-concat')
const createTorrent = require('create-torrent')
const debugFactory = require('debug')
const DHT = require('bittorrent-dht/client') // browser exclude
const loadIPSet = require('load-ip-set') // browser exclude
const parallel = require('run-parallel')
const parseTorrent = require('parse-torrent')
const Peer = require('simple-peer')
const queueMicrotask = require('queue-microtask')
const randombytes = require('randombytes')
const sha1 = require('simple-sha1')
const { ThrottleGroup } = require('speed-limiter')
const ConnPool = require('./lib/conn-pool.js') // browser exclude
const Torrent = require('./lib/torrent.js')
const { version: VERSION } = require('./package.json')

const debug = debugFactory('webtorrent')
const speedometer = require('./lib/speedometer')

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
class WebTorrent extends EventEmitter {
  constructor (opts = {}) {
    super()

    if (typeof opts.peerId === 'string') {
      this.peerId = opts.peerId
    } else if (Buffer.isBuffer(opts.peerId)) {
      this.peerId = opts.peerId.toString('hex')
    } else {
      this.peerId = Buffer.from(VERSION_PREFIX + randombytes(9).toString('base64')).toString('hex')
    }
    this.peerIdBuffer = Buffer.from(this.peerId, 'hex')

    if (typeof opts.nodeId === 'string') {
      this.nodeId = opts.nodeId
    } else if (Buffer.isBuffer(opts.nodeId)) {
      this.nodeId = opts.nodeId.toString('hex')
    } else {
      this.nodeId = randombytes(20).toString('hex')
    }
    this.nodeIdBuffer = Buffer.from(this.nodeId, 'hex')

    this._debugId = this.peerId.toString('hex').substring(0, 7)

    this.destroyed = false
    this.listening = false
    this.torrentPort = opts.torrentPort || 0
    this.dhtPort = opts.dhtPort || 0
    this.tracker = opts.tracker !== undefined ? opts.tracker : {}
    this.lsd = opts.lsd !== false
    this.torrents = []
    this.maxConns = Number(opts.maxConns) || 55
    this.utp = WebTorrent.UTP_SUPPORT && opts.utp !== false

    this._downloadLimit = Math.max((typeof opts.downloadLimit === 'number') ? opts.downloadLimit : -1, -1)
    this._uploadLimit = Math.max((typeof opts.uploadLimit === 'number') ? opts.uploadLimit : -1, -1)

    this.serviceWorker = null
    this.workerKeepAliveInterval = null
    this.workerPortCount = 0

    if (opts.secure === true) {
      require('./lib/peer').enableSecure()
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
    this._downloadSpeed = speedometer()
    this._uploadSpeed = speedometer()

    if (opts.dht !== false && typeof DHT === 'function' /* browser exclude */) {
      // use a single DHT instance for all torrents, so the routing table can be reused
      this.dht = new DHT(Object.assign({}, { nodeId: this.nodeId }, opts.dht))

      this.dht.once('error', err => {
        this._destroy(err)
      })

      this.dht.once('listening', () => {
        const address = this.dht.address()
        if (address) this.dhtPort = address.port
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
   * Accepts an existing service worker registration [navigator.serviceWorker.controller]
   * which must be activated, "creates" a file server for streamed file rendering to use.
   *
   * @param  {ServiceWorker} controller
   * @param {function=} cb
   * @return {null}
   */
  loadWorker (controller, cb = () => {}) {
    if (!(controller instanceof ServiceWorker)) throw new Error('Invalid worker registration')
    if (controller.state !== 'activated') throw new Error('Worker isn\'t activated')
    const keepAliveTime = 20000

    this.serviceWorker = controller

    navigator.serviceWorker.addEventListener('message', event => {
      const { data } = event
      if (!data.type || !data.type === 'webtorrent' || !data.url) return null
      let [infoHash, ...filePath] = data.url.slice(data.url.indexOf(data.scope + 'webtorrent/') + 11 + data.scope.length).split('/')
      filePath = decodeURI(filePath.join('/'))
      if (!infoHash || !filePath) return null

      const [port] = event.ports

      const file = this.get(infoHash) && this.get(infoHash).files.find(file => file.path === filePath)
      if (!file) return null

      const [response, stream, raw] = file._serve(data)
      const asyncIterator = stream && stream[Symbol.asyncIterator]()

      const cleanup = () => {
        port.onmessage = null
        if (stream) stream.destroy()
        if (raw) raw.destroy()
        this.workerPortCount--
        if (!this.workerPortCount) {
          clearInterval(this.workerKeepAliveInterval)
          this.workerKeepAliveInterval = null
        }
      }

      port.onmessage = async msg => {
        if (msg.data) {
          let chunk
          try {
            chunk = (await asyncIterator.next()).value
          } catch (e) {
            // chunk is yet to be downloaded or it somehow failed, should this be logged?
          }
          port.postMessage(chunk)
          if (!chunk) cleanup()
          if (!this.workerKeepAliveInterval) this.workerKeepAliveInterval = setInterval(() => fetch(`${this.serviceWorker.scriptURL.substr(0, this.serviceWorker.scriptURL.lastIndexOf('/') + 1).slice(window.location.origin.length)}webtorrent/keepalive/`), keepAliveTime)
        } else {
          cleanup()
        }
      }
      this.workerPortCount++
      port.postMessage(response)
    })
    cb(this.serviceWorker)
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
   * @return {Torrent|null}
   */
  get (torrentId) {
    if (torrentId instanceof Torrent) {
      if (this.torrents.includes(torrentId)) return torrentId
    } else {
      let parsed
      try { parsed = parseTorrent(torrentId) } catch (err) {}

      if (!parsed) return null
      if (!parsed.infoHash) throw new Error('Invalid torrent identifier')

      for (const torrent of this.torrents) {
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

    parallel(input.map(item => cb => {
      if (!opts.preloadedStore && isReadable(item)) {
        concat(item, (err, buf) => {
          if (err) return cb(err)
          buf.name = item.name
          cb(null, buf)
        })
      } else {
        cb(null, item)
      }
    }), (err, input) => {
      if (this.destroyed) return
      if (err) return torrent._destroy(err)

      createTorrent.parseInput(input, opts, (err, files) => {
        if (this.destroyed) return
        if (err) return torrent._destroy(err)

        streams = files.map(file => file.getStream)

        createTorrent(input, opts, (err, torrentBuf) => {
          if (this.destroyed) return
          if (err) return torrent._destroy(err)

          const existingTorrent = this.get(torrentBuf)
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
  remove (torrentId, opts, cb) {
    if (typeof opts === 'function') return this.remove(torrentId, null, opts)

    this._debug('remove')
    const torrent = this.get(torrentId)
    if (!torrent) throw new Error(`No torrent with id ${torrentId}`)
    this._remove(torrentId, opts, cb)
  }

  _remove (torrentId, opts, cb) {
    if (typeof opts === 'function') return this._remove(torrentId, null, opts)

    const torrent = this.get(torrentId)
    if (!torrent) return
    this.torrents.splice(this.torrents.indexOf(torrent), 1)
    torrent.destroy(opts, cb)
    if (this.dht) {
      this.dht._tables.remove(torrent.infoHash)
    }
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
      if (address) this.torrentPort = address.port
    }

    this.emit('listening')
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = `[${this._debugId}] ${args[0]}`
    debug(...args)
  }

  _getByHash (infoHashHash) {
    for (const torrent of this.torrents) {
      if (!torrent.infoHashHash) {
        torrent.infoHashHash = sha1.sync(Buffer.from('72657132' /* 'req2' */ + torrent.infoHash, 'hex'))
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

module.exports = WebTorrent
