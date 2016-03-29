module.exports = Swarm

var addrToIPPort = require('addr-to-ip-port')
var debug = require('debug')('webtorrent:swarm')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var net = require('net') // browser exclude
var speedometer = require('speedometer')

var Peer = require('./peer')
var TCPPool = require('./tcp-pool') // browser-exclude

var MAX_CONNS = 55
var RECONNECT_WAIT = [ 1000, 5000, 15000 ]

inherits(Swarm, EventEmitter)

/**
 * BitTorrent Swarm
 *
 * Abstraction of a BitTorrent "swarm", which is handy for managing all peer
 * connections for a given torrent download. This handles connecting to peers,
 * listening for incoming connections, and doing the initial peer wire protocol
 * handshake with peers. It also tracks total data uploaded/downloaded to/from
 * the swarm.
 *
 * @param {Buffer|string} infoHash
 * @param {Buffer|string} peerId
 * @param {Object} opts
 * @param {Object} opts.handshake handshake options (passed to bittorrent-protocol)
 * @param {number} opts.maxConns maximum number of connections in swarm
 */
function Swarm (infoHash, peerId, opts) {
  var self = this
  if (!(self instanceof Swarm)) return new Swarm(infoHash, peerId, opts)
  EventEmitter.call(self)

  self.infoHash = typeof infoHash === 'string'
    ? infoHash
    : infoHash.toString('hex')
  self.infoHashBuffer = new Buffer(self.infoHash, 'hex')

  self.peerId = typeof peerId === 'string'
    ? peerId
    : peerId.toString('hex')
  self.peerIdBuffer = new Buffer(self.peerId, 'hex')

  if (!opts) opts = {}

  debug('new swarm (i %s p %s)', self.infoHash, self.peerId)

  self.handshakeOpts = opts.handshake // handshake extensions (optional)
  self.maxConns = Number(opts.maxConns) || MAX_CONNS

  self.destroyed = false
  self.listening = false
  self.paused = false

  self.server = null // tcp listening socket
  self.wires = [] // open wires (added *after* handshake)

  self._queue = [] // queue of outgoing tcp peers to connect to
  self._peers = {} // connected peers (addr/peerId -> Peer)
  self._peersLength = 0 // number of elements in `self._peers` (cache, for perf)
  self._port = 0 // tcp listening port (cache, for perf)

  // track stats
  self.downloaded = 0
  self.uploaded = 0
  self.downloadSpeed = speedometer()
  self.uploadSpeed = speedometer()
}

Object.defineProperty(Swarm.prototype, 'ratio', {
  get: function () {
    var self = this
    return (self.uploaded / self.downloaded) || 0
  }
})

Object.defineProperty(Swarm.prototype, 'numQueued', {
  get: function () {
    var self = this
    return self._queue.length + (self._peersLength - self.numConns)
  }
})

Object.defineProperty(Swarm.prototype, 'numConns', {
  get: function () {
    var self = this
    var numConns = 0
    for (var id in self._peers) {
      var peer = self._peers[id]
      if (peer && peer.connected) numConns += 1
    }
    return numConns
  }
})

Object.defineProperty(Swarm.prototype, 'numPeers', {
  get: function () {
    var self = this
    return self.wires.length
  }
})

/**
 * Add a peer to the swarm.
 * @param {string|simple-peer} peer    "ip:port" string or simple-peer instance
 * @param {string}             peer.id bittorrent peer id (when `peer` is simple-peer)
 * @return {boolean} true if peer was added, false if peer was invalid

 */
Swarm.prototype.addPeer = function (peer) {
  var self = this
  var newPeer = self._addPeer(peer)
  return !!newPeer // don't expose private Peer instance in return value
}

Swarm.prototype._addPeer = function (peer) {
  var self = this
  if (self.destroyed) {
    debug('ignoring added peer: swarm already destroyed')
    if (typeof peer !== 'string') peer.destroy()
    return null
  }
  if (typeof peer === 'string' && !self._validAddr(peer)) {
    debug('ignoring added peer: invalid address %s', peer)
    return null
  }

  var id = (peer && peer.id) || peer
  if (self._peers[id]) {
    debug('ignoring added peer: duplicate peer id')
    if (typeof peer !== 'string') peer.destroy()
    return null
  }

  if (self.paused) {
    debug('ignoring added peer: swarm paused')
    if (typeof peer !== 'string') peer.destroy()
    return null
  }

  debug('addPeer %s', id)

  var newPeer
  if (typeof peer === 'string') {
    // `peer` is an addr ("ip:port" string)
    newPeer = Peer.createTCPOutgoingPeer(peer, self)
  } else {
    // `peer` is a WebRTC connection (simple-peer)
    newPeer = Peer.createWebRTCPeer(peer, self)
  }

  self._peers[newPeer.id] = newPeer
  self._peersLength += 1

  if (typeof peer === 'string') {
    // `peer` is an addr ("ip:port" string)
    self._queue.push(newPeer)
    self._drain()
  }

  return newPeer
}

/**
 * Add a web seed to the swarm.
 * @param {string} url web seed url
 * @param {Object} parsedTorrent
 */
Swarm.prototype.addWebSeed = function (url, parsedTorrent) {
  var self = this
  if (self.destroyed) return

  if (!/^https?:\/\/.+/.test(url)) {
    debug('ignoring invalid web seed %s (from swarm.addWebSeed)', url)
    return
  }

  if (self._peers[url]) return

  debug('addWebSeed %s', url)

  var newPeer = Peer.createWebSeedPeer(url, parsedTorrent, self)
  self._peers[newPeer.id] = newPeer
  self._peersLength += 1
}

/**
 * Called whenever a new incoming TCP peer connects to this swarm. Called with a peer
 * that has already sent a handshake.
 * @param {Peer} peer
 */
Swarm.prototype._addIncomingPeer = function (peer) {
  var self = this
  if (self.destroyed) return peer.destroy(new Error('swarm already destroyed'))
  if (self.paused) return peer.destroy(new Error('swarm paused'))

  if (!self._validAddr(peer.addr)) {
    return peer.destroy(new Error('invalid addr ' + peer.addr + ' (from incoming)'))
  }
  debug('_addIncomingPeer %s', peer.id)

  self._peers[peer.id] = peer
  self._peersLength += 1
}

/**
 * Remove a peer from the swarm.
 * @param  {string} id for tcp peers, "ip:port" string; for webrtc peers, peerId
 */
Swarm.prototype.removePeer = function (id) {
  var self = this
  var peer = self._peers[id]
  if (!peer) return

  debug('removePeer %s', id)

  self._peers[id] = null
  self._peersLength -= 1

  peer.destroy()

  // If swarm was at capacity before, try to open a new connection now
  self._drain()
}

/**
 * Temporarily stop connecting to new peers. Note that this does not pause the streams
 * of existing connections or their wires.
 */
Swarm.prototype.pause = function () {
  var self = this
  if (self.destroyed) return
  debug('pause')
  self.paused = true
}

/**
 * Resume connecting to new peers.
 */
Swarm.prototype.resume = function () {
  var self = this
  if (self.destroyed) return
  debug('resume')
  self.paused = false
  self._drain()
}

/**
 * Listen on the given port for peer connections.
 * @param {number} port
 * @param {string=} hostname
 * @param {function=} onlistening
 */
Swarm.prototype.listen = function (port, hostname, onlistening) {
  var self = this
  if (typeof hostname === 'function') {
    onlistening = hostname
    hostname = undefined
  }
  if (self.listening) throw new Error('swarm already listening')
  if (onlistening) self.once('listening', onlistening)

  if (typeof TCPPool === 'function') {
    self._port = port || TCPPool.getDefaultListenPort(self.infoHash)
    self._hostname = hostname

    debug('listen %s', port)

    var pool = TCPPool.addSwarm(self)
    self.server = pool.server
  } else {
    // In browser, listen() is no-op, but still fire 'listening' event so that
    // same code works in node and the browser.
    process.nextTick(function () {
      self._onListening(0)
    })
  }
}

Swarm.prototype._onListening = function (port) {
  var self = this
  self._port = port
  self.listening = true
  self.emit('listening')
}

Swarm.prototype.address = function () {
  var self = this
  if (!self.listening) return null
  return self.server
    ? self.server.address()
    : { port: 0, family: 'IPv4', address: '127.0.0.1' }
}

/**
 * Destroy the swarm, close all open peer connections, and do cleanup.
 * @param {function} onclose
 */
Swarm.prototype.destroy = function (onclose) {
  var self = this
  if (self.destroyed) return

  self.destroyed = true
  self.listening = false
  self.paused = false

  if (onclose) self.once('close', onclose)

  debug('destroy')

  for (var id in self._peers) {
    self.removePeer(id)
  }

  if (typeof TCPPool === 'function') {
    TCPPool.removeSwarm(self, function () {
      // TODO: only emit when all peers are destroyed
      self.emit('close')
    })
  } else {
    process.nextTick(function () {
      self.emit('close')
    })
  }
}

/**
 * Pop a peer off the FIFO queue and connect to it. When _drain() gets called,
 * the queue will usually have only one peer in it, except when there are too
 * many peers (over `this.maxConns`) in which case they will just sit in the
 * queue until another connection closes.
 */
Swarm.prototype._drain = function () {
  var self = this
  debug('_drain numConns %s maxConns %s', self.numConns, self.maxConns)
  if (typeof net.connect !== 'function' || self.destroyed || self.paused ||
      self.numConns >= self.maxConns) {
    return
  }
  debug('drain (%s queued, %s/%s peers)', self.numQueued, self.numPeers, self.maxConns)

  var peer = self._queue.shift()
  if (!peer) return // queue could be empty

  debug('tcp connect attempt to %s', peer.addr)

  var parts = addrToIPPort(peer.addr)
  var opts = {
    host: parts[0],
    port: parts[1]
  }
  if (self._hostname) opts.localAddress = self._hostname

  var conn = peer.conn = net.connect(opts)

  conn.once('connect', function () { peer.onConnect() })
  conn.once('error', function (err) { peer.destroy(err) })
  peer.setConnectTimeout()

  // When connection closes, attempt reconnect after timeout (with exponential backoff)
  conn.on('close', function () {
    if (self.destroyed) return

    if (peer.retries >= RECONNECT_WAIT.length) {
      debug(
        'conn %s closed: will not re-add (max %s attempts)',
        peer.addr, RECONNECT_WAIT.length
      )
      return
    }

    var ms = RECONNECT_WAIT[peer.retries]
    debug(
      'conn %s closed: will re-add to queue in %sms (attempt %s)',
      peer.addr, ms, peer.retries + 1
    )

    var reconnectTimeout = setTimeout(function reconnectTimeout () {
      var newPeer = self._addPeer(peer.addr)
      if (newPeer) newPeer.retries = peer.retries + 1
    }, ms)
    if (reconnectTimeout.unref) reconnectTimeout.unref()
  })
}

Swarm.prototype._onError = function (err) {
  var self = this
  self.emit('error', err)
  self.destroy()
}

/**
 * Returns `true` if string is valid IPv4/6 address, and is not the address of this swarm.
 * @param {string} addr
 * @return {boolean}
 */
Swarm.prototype._validAddr = function (addr) {
  var self = this
  var parts
  try {
    parts = addrToIPPort(addr)
  } catch (e) {
    return false
  }
  var host = parts[0]
  var port = parts[1]
  return port > 0 && port < 65535 && !(host === '127.0.0.1' && port === self._port)
}
