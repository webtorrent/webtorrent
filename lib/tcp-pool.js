module.exports = TCPPool

var debug = require('debug')('webtorrent:tcp-pool')
var net = require('net') // browser exclude

var Peer = require('./peer')

/**
 * Shared TCP pools; shared among all swarms
 * @type {Object} port: number -> pool: TCPPool
 */
var tcpPools = {}

/**
 * TCPPool
 *
 * A "TCP pool" allows multiple swarms to listen on the same TCP port and determines
 * which swarm incoming connections are intended for by inspecting the bittorrent
 * handshake that the remote peer sends.
 *
 * @param {number} port
 * @param {string} hostname
 */
function TCPPool (port, hostname) {
  var self = this

  self.port = port
  self.listening = false
  self.swarms = {} // infoHash (hex) -> Swarm

  debug('new TCPPool (port: %s, hostname: %s)', port, hostname)

  // Save incoming conns so they can be destroyed if server is closed before the conn is
  // passed off to a Swarm.
  self.pendingConns = []

  self.server = net.createServer()
  self.server.on('connection', function (conn) { self._onConnection(conn) })
  self.server.on('error', function (err) { self._onError(err) })
  self.server.on('listening', function () { self._onListening() })
  self.server.listen(self.port, hostname)
}

/**
 * STATIC METHOD
 * Add a swarm to a pool, creating a new pool if necessary.
 * @param {Swarm} swarm
 */
TCPPool.addSwarm = function (swarm) {
  var pool = tcpPools[swarm._port]
  if (!pool) pool = tcpPools[swarm._port] = new TCPPool(swarm._port, swarm._hostname)
  pool.addSwarm(swarm)
  return pool
}

/**
 * STATIC METHOD
 * Remove a swarm from its pool.
 * @param {Swarm} swarm
 */
TCPPool.removeSwarm = function (swarm, cb) {
  var pool = tcpPools[swarm._port]
  if (!pool) return cb()
  pool.removeSwarm(swarm)

  var numSwarms = 0
  for (var infoHash in pool.swarms) {
    var s = pool.swarms[infoHash]
    if (s) numSwarms += 1
  }
  if (numSwarms === 0) pool.destroy(cb)
  else process.nextTick(cb)
}

/**
 * STATIC METHOD
 * When `Swarm.prototype.listen` is called without specifying a port, a reasonable
 * default port must be chosen. If there already exists an active TCP pool, then return
 * that pool's port so that TCP server can be re-used. Otherwise, return 0 so node will
 * pick a free port.
 *
 * @return {number} port
 */
TCPPool.getDefaultListenPort = function (infoHash) {
  for (var port in tcpPools) {
    var pool = tcpPools[port]
    if (pool && !pool.swarms[infoHash]) return pool.port
  }
  return 0
}

/**
 * Add a swarm to this TCP pool.
 * @param {Swarm} swarm
 */
TCPPool.prototype.addSwarm = function (swarm) {
  var self = this

  if (self.swarms[swarm.infoHash]) {
    process.nextTick(function () {
      swarm._onError(new Error(
        'There is already a swarm with info hash ' + swarm.infoHash + ' ' +
        'listening on port ' + swarm._port
      ))
    })
    return
  }

  self.swarms[swarm.infoHash] = swarm

  if (self.listening) {
    process.nextTick(function () {
      swarm._onListening(self.port)
    })
  }

  debug('add swarm %s to tcp pool %s', swarm.infoHash, self.port)
}

/**
 * Remove a swarm from this TCP pool.
 * @param  {Swarm} swarm
 */
TCPPool.prototype.removeSwarm = function (swarm) {
  var self = this
  debug('remove swarm %s from tcp pool %s', swarm.infoHash, self.port)
  self.swarms[swarm.infoHash] = null
}

/**
 * Destroy this TCP pool.
 * @param  {function} cb
 */
TCPPool.prototype.destroy = function (cb) {
  var self = this
  debug('destroy tcp pool %s', self.port)

  self.listening = false

  // Destroy all open connection objects so server can close gracefully without waiting
  // for connection timeout or remote peer to disconnect.
  self.pendingConns.forEach(function (conn) {
    conn.destroy()
  })

  tcpPools[self.port] = null

  try {
    self.server.close(cb)
  } catch (err) {
    if (cb) process.nextTick(cb)
  }
}

TCPPool.prototype._onListening = function () {
  var self = this

  // Fix for Docker Node image. Sometimes server.address() returns `null`.
  // See issue: https://github.com/feross/bittorrent-swarm/pull/18
  var address = self.server.address() || { port: 0 }
  var port = address.port

  debug('tcp pool listening on %s', port)

  if (port !== self.port) {
    // `port` was 0 when `listen` was called; update to the port that node selected
    tcpPools[self.port] = null
    self.port = port
    tcpPools[self.port] = self
  }

  self.listening = true

  for (var infoHash in self.swarms) {
    var swarm = self.swarms[infoHash]
    if (swarm) swarm._onListening(self.port)
  }
}

/**
 * On incoming connections, we expect the remote peer to send a handshake first. Based
 * on the infoHash in that handshake, route the peer to the right swarm.
 */
TCPPool.prototype._onConnection = function (conn) {
  var self = this

  // If the connection has already been closed before the `connect` event is fired,
  // then `remoteAddress` will not be available, and we can't use this connection.
  // - Node.js issue: https://github.com/nodejs/node-v0.x-archive/issues/7566
  // - WebTorrent issue: https://github.com/feross/webtorrent/issues/398
  if (!conn.remoteAddress) {
    conn.on('error', noop)
    conn.destroy()
    return
  }

  self.pendingConns.push(conn)
  conn.once('close', removePendingConn)

  function removePendingConn () {
    self.pendingConns.splice(self.pendingConns.indexOf(conn))
  }

  var peer = Peer.createTCPIncomingPeer(conn)

  peer.wire.once('handshake', function (infoHash, peerId) {
    removePendingConn()
    conn.removeListener('close', removePendingConn)

    var swarm = self.swarms[infoHash]
    if (swarm) {
      peer.swarm = swarm
      swarm._addIncomingPeer(peer)
      peer.onHandshake(infoHash, peerId)
    } else {
      var err = new Error('Unexpected info hash ' + infoHash + ' from incoming peer ' +
        peer.id + ': destroying peer')
      peer.destroy(err)
    }
  })
}

TCPPool.prototype._onError = function (err) {
  var self = this
  self.destroy()
  for (var infoHash in self.swarms) {
    var swarm = self.swarms[infoHash]
    if (swarm) {
      self.removeSwarm(swarm)
      swarm._onError(err)
    }
  }
}

function noop () {}
