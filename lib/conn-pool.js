const arrayRemove = require('unordered-array-remove')
const debug = require('debug')('webtorrent:conn-pool')
const net = require('net') // browser exclude
const utp = require('utp-native') // browser exclude

const Peer = require('./peer')

/**
 * Connection Pool
 *
 * A connection pool allows multiple swarms to listen on the same TCP/UDP port and determines
 * which swarm incoming connections are intended for by inspecting the bittorrent
 * handshake that the remote peer sends.
 *
 * @param {number} port
 */
class ConnPool {
  constructor (client) {
    debug('create pool (port %s)', client.torrentPort)
    const self = this
    let i = 0
    this._client = client
    this.utp = client.utp

    // Temporarily store incoming connections so they can be destroyed if the server is
    // closed before the connection is passed off to a Torrent.
    this._pendingConns = []

    this._onConnectionBound = conn => {
      this._onConnection(conn)
    }

    this._onListening = () => {
      // Kickoff client onListening when everything's setup
      if (!self._client.utp || ++i === 2) {
        self._client._onListening()
      // Start UTP if needed
      } else if (self._client.utp) {
        self.utpServer.listen(self.tcpServer.address().port)
      }
    }

    this._onError = e => {
      this._client._destroy(e)
    }

    // Setup TCP
    this.tcpServer = net.createServer()
    this.tcpServer.on('connection', this._onConnectionBound)
    this.tcpServer.on('error', this._onError)

    // Setup uTP
    if (this.utp) {
      this.utpServer = utp.createServer()
      this.utpServer.on('connection', this._onConnectionBound)
      this.utpServer.on('error', this._onError)
      this.utpServer.on('listening', this._onListening)
    }

    // Start TCP
    this.tcpServer.listen(client.torrentPort, this._onListening)
  }

  /**
   * Destroy this TCP pool.
   * @param  {function} cb
   */
  destroy (cb) {
    debug('destroy conn pool')

    if (this._client.utp) {
      this.utpServer.removeListener('connection', this._onConnectionBound)
      this.utpServer.removeListener('listening', this._onListening)
      this.utpServer.removeListener('error', this._onError)
    }

    this.tcpServer.removeListener('connection', this._onConnectionBound)
    this.tcpServer.removeListener('listening', this._onListening)
    this.tcpServer.removeListener('error', this._onError)

    // Destroy all open connection objects so server can close gracefully without waiting
    // for connection timeout or remote peer to disconnect.
    this._pendingConns.forEach(conn => {
      conn.on('error', noop)
      conn.destroy()
    })

    try {
      this.utpServer.close()
    } catch (e) { }

    try {
      this.server.close(cb)
    } catch (err) {
      if (cb) process.nextTick(cb)
    }

    this.tcpServer = null
    this.utpServer = null
    this._client = null
    this._pendingConns = null
  }

  /**
   * On incoming connections, we expect the remote peer to send a handshake first. Based
   * on the infoHash in that handshake, route the peer to the right swarm.
   */
  _onConnection (conn) {
    const self = this

    // If the connection has already been closed before the `connect` event is fired,
    // then `remoteAddress` will not be available, and we can't use this connection.
    // - Node.js issue: https://github.com/nodejs/node-v0.x-archive/issues/7566
    // - WebTorrent issue: https://github.com/webtorrent/webtorrent/issues/398
    if (!conn.address().address) {
      conn.destroy()
      return
    }

    self._pendingConns.push(conn)
    conn.once('close', cleanupPending)

    const peer = Peer.createIncomingPeer(conn)
    const wire = peer.wire
    wire.once('handshake', onHandshake)

    function onHandshake (infoHash, peerId) {
      cleanupPending()

      const torrent = self._client.get(infoHash)
      if (torrent) {
        peer.swarm = torrent
        torrent._addIncomingPeer(peer)
        peer.onHandshake(infoHash, peerId)
      } else {
        const err = new Error(
          `Unexpected info hash ${infoHash} from incoming peer ${peer.id}`
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
}

function noop () {}

module.exports = ConnPool
