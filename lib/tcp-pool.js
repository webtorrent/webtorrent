module.exports = TCPPool

var arrayRemove = require('unordered-array-remove')
var debug = require('debug')('webtorrent:tcp-pool')
var net = require('net') // browser exclude

var Peer = require('./peer')

/**
 * TCPPool
 *
 * A "TCP pool" allows multiple swarms to listen on the same TCP port and determines
 * which swarm incoming connections are intended for by inspecting the bittorrent
 * handshake that the remote peer sends.
 *
 * @param {number} port
 */
function TCPPool (client) {
  var self = this
  debug('create tcp pool (port %s)', client.torrentPort)

  self.server = net.createServer()
  self._client = client

  // Temporarily store incoming connections so they can be destroyed if the server is
  // closed before the connection is passed off to a Torrent.
  self._pendingConns = []

  self._onConnectionBound = function (conn) {
    self._onConnection(conn)
  }

  self._onListening = function () {
    self._client._onListening()
  }

  self._onError = function (err) {
    self._client._destroy(err)
  }

  self.server.on('connection', self._onConnectionBound)
  self.server.on('listening', self._onListening)
  self.server.on('error', self._onError)

  self.server.listen(client.torrentPort)
}

/**
 * Destroy this TCP pool.
 * @param  {function} cb
 */
TCPPool.prototype.destroy = function (cb) {
  var self = this
  debug('destroy tcp pool')

  self.server.removeListener('connection', self._onConnectionBound)
  self.server.removeListener('listening', self._onListening)
  self.server.removeListener('error', self._onError)

  // Destroy all open connection objects so server can close gracefully without waiting
  // for connection timeout or remote peer to disconnect.
  self._pendingConns.forEach(function (conn) {
    conn.on('error', noop)
    conn.destroy()
  })

  try {
    self.server.close(cb)
  } catch (err) {
    if (cb) process.nextTick(cb)
  }

  self.server = null
  self._client = null
  self._pendingConns = null
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

  self._pendingConns.push(conn)
  conn.once('close', cleanupPending)

  var peer = Peer.createTCPIncomingPeer(conn)

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
