module.exports = ConnPool

var arrayRemove = require('unordered-array-remove')
var debug = require('debug')('webtorrent:conn-pool')
var net = require('net') // browser exclude
var utp = require('utp-native') // browser exclude

var Peer = require('./peer')

/**
 * Connection Pool
 *
 * A connection pool allows multiple swarms to listen on the same TCP/UDP port and determines
 * which swarm incoming connections are intended for by inspecting the bittorrent
 * handshake that the remote peer sends.
 *
 * @param {number} port
 */
function ConnPool (client) {
  var self = this
  debug('create connection pool (port %s)', client.torrentPort)

  // Temporarily store incoming connections so they can be destroyed if the server is
  // closed before the connection is passed off to a Torrent.
  self._pendingConns = []

  self._onConnectionBound = function (conn) {
    self._onConnection(conn)
  }

  var listening = 0
  self._onListening = function (e) {
    if (++listening !== 2) return
    self._client._onListening()
  }

  self._onError = function (err) {
    self._client._destroy(err)
  }

  self._client = client

  // Setup TCP
  self.tcpServer = net.createServer()
  self.tcpServer.on('connection', self._onConnectionBound)
  self.tcpServer.on('listening', self._onListening)
  self.tcpServer.on('error', self._onError)

  // Setup uTP
  self.utpServer = utp.createServer()
  self.utpServer.on('connection', self._onConnectionBound)
  self.utpServer.on('listening', self._onListening)
  self.utpServer.on('error', self._onError)

  // Start listening TCP then uTP
  self.tcpServer.listen(client.torrentPort, function () {
    self.utpServer.listen(this.address().port)
  })
}

/**
 * Destroy this pool.
 * @param  {function} cb
 */
ConnPool.prototype.destroy = function (cb) {
  var self = this
  debug('destroy pool')

  self.utpServer.removeListener('connection', self._onConnectionBound)
  self.utpServer.removeListener('listening', self._onListening)
  self.utpServer.removeListener('error', self._onError)

  self.tcpServer.removeListener('connection', self._onConnectionBound)
  self.tcpServer.removeListener('listening', self._onListening)
  self.tcpServer.removeListener('error', self._onError)

  // Destroy all open connection objects so server can close gracefully without waiting
  // for connection timeout or remote peer to disconnect.
  self._pendingConns.forEach(function (conn) {
    conn.on('error', noop)
    conn.destroy()
  })

  try {
    self.utpServer.close()
  } catch (e) { }

  try {
    self.tcpServer.close(cb)
  } catch (err) {
    if (cb) process.nextTick(cb)
  }

  self.tcpServer = null
  self.utpServer = null
  self._client = null
  self._pendingConns = null
}

/**
 * On incoming connections, we expect the remote peer to send a handshake first. Based
 * on the infoHash in that handshake, route the peer to the right swarm.
 */
ConnPool.prototype._onConnection = function (conn) {
  var self = this

  // If the connection has already been closed before the `connect` event is fired,
  // then `remoteAddress` will not be available, and we can't use this connection.
  // - Node.js issue: https://github.com/nodejs/node-v0.x-archive/issues/7566
  // - WebTorrent issue: https://github.com/webtorrent/webtorrent/issues/398

  if (!conn.address().address) {
    conn.on('error', noop)
    conn.destroy()
    return
  }

  self._pendingConns.push(conn)
  conn.once('close', cleanupPending)

  var peer = Peer.createIncomingPeer(conn)

  var wire = peer.wire
  wire.once('handshake', onHandshake)

  function onHandshake (infoHash, peerId) {
    cleanupPending()

    var torrent = self._client.get(infoHash)
    if (torrent) {
      peer.swarm = torrent
      torrent._addIncomingPeer(peer)
      peer.onHandshake(infoHash, peerId)
    } else {
      var err = new Error(
        'Unexpected info hash ' + infoHash + ' from incoming peer ' + peer.id
      )
      peer.destroy(err)
    }
  }

  function cleanupPending () {
    conn.removeListener('close', cleanupPending)
    wire.removeListener('handshake', onHandshake)
    if (self._pendingConns) {
      arrayRemove(self._pendingConns, self._pendingConns.indexOf(conn))
    }
  }
}

function noop () {}
