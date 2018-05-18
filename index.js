/* global FileList */

const { Buffer } = require('safe-buffer')
const { EventEmitter } = require('events')
const concat = require('simple-concat')
const createTorrent = require('create-torrent')
const debug = require('debug')('webtorrent')
const DHT = require('bittorrent-dht/client') // browser exclude
const loadIPSet = require('load-ip-set') // browser exclude
const parallel = require('run-parallel')
const parseTorrent = require('parse-torrent')
const path = require('path')
const Peer = require('simple-peer')
const randombytes = require('randombytes')
const speedometer = require('speedometer')

const TCPPool = require('./lib/tcp-pool') // browser exclude
const Torrent = require('./lib/torrent')
const VERSION = require('./package.json').version

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
    this.torrents = []
    this.maxConns = Number(opts.maxConns) || 55

    this._debug(
      'new webtorrent (peerId %s, nodeId %s, port %s)',
      this.peerId, this.nodeId, this.torrentPort
    )

    if (this.tracker) {
      if (typeof this.tracker !== 'object') this.tracker = {}
      if (opts.rtcConfig) {
        // TODO: remove in v1
        console.warn('WebTorrent: opts.rtcConfig is deprecated. Use opts.tracker.rtcConfig instead')
        this.tracker.rtcConfig = opts.rtcConfig
      }
      if (opts.wrtc) {
        // TODO: remove in v1
        console.warn('WebTorrent: opts.wrtc is deprecated. Use opts.tracker.wrtc instead')
        this.tracker.wrtc = opts.wrtc
      }
      if (global.WRTC && !this.tracker.wrtc) {
        this.tracker.wrtc = global.WRTC
      }
    }

    if (typeof TCPPool === 'function') {
      this._tcpPool = new TCPPool(this)
    } else {
      process.nextTick(() => {
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
        if (err) return this.error(`Failed to load blocklist: ${err.message}`)
        this.blocked = ipSet
        ready()
      })
    } else {
      process.nextTick(ready)
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

  // TODO: remove in v1
  download (torrentId, opts, ontorrent) {
    console.warn('WebTorrent: client.download() is deprecated. Use client.add() instead')
    return this.add(torrentId, opts, ontorrent)
  }

  /**
   * Start downloading a new torrent. Aliased as `client.download`.
   * @param {string|Buffer|Object} torrentId
   * @param {Object} opts torrent-specific options
   * @param {function=} ontorrent called when the torrent is ready (has metadata)
   */
  add (torrentId, opts = {}, ontorrent) {
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
      if (typeof ontorrent === 'function') ontorrent(torrent)
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
          // when a filesystem path is specified, files are already in the FS store
          if (isFilePath) return cb()
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
    else if (!Array.isArray(input)) input = [ input ]

    parallel(input.map(item => cb => {
      if (isReadable(item)) concat(item, cb)
      else cb(null, item)
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
            torrent._destroy(new Error(`Cannot add duplicate torrent ${existingTorrent.infoHash}`))
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
  remove (torrentId, cb) {
    this._debug('remove')
    const torrent = this.get(torrentId)
    if (!torrent) throw new Error(`No torrent with id ${torrentId}`)
    this._remove(torrentId, cb)
  }

  _remove (torrentId, cb) {
    const torrent = this.get(torrentId)
    if (!torrent) return
    this.torrents.splice(this.torrents.indexOf(torrent), 1)
    torrent.destroy(cb)
  }

  address () {
    if (!this.listening) return null
    return this._tcpPool
      ? this._tcpPool.server.address()
      : { address: '0.0.0.0', family: 'IPv4', port: 0 }
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

    if (this._tcpPool) {
      tasks.push(cb => {
        this._tcpPool.destroy(cb)
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
    this._tcpPool = null
    this.dht = null
  }

  _onListening () {
    this._debug('listening')
    this.listening = true

    if (this._tcpPool) {
      // Sometimes server.address() returns `null` in Docker.
      const address = this._tcpPool.server.address()
      if (address) this.torrentPort = address.port
    }

    this.emit('listening')
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = `[${this._debugId}] ${args[0]}`
    debug(...args)
  }
}

WebTorrent.WEBRTC_SUPPORT = Peer.WEBRTC_SUPPORT
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
