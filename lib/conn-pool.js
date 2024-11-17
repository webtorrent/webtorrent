import net from 'net' // browser exclude
import debugFactory from 'debug'
import queueMicrotask from 'queue-microtask'

import Peer from './peer.js'
import utp from './utp.cjs' // browser exclude

const debug = debugFactory('webtorrent:conn-pool')

/**
 * Connection Pool
 *
 * A connection pool allows multiple swarms to listen on the same TCP/UDP port and determines
 * which swarm incoming connections are intended for by inspecting the bittorrent
 * handshake that the remote peer sends.
 *
 * @param {number} port
 */
export default class ConnPool {
  constructor (client) {
    debug('create pool (port %s)', client.torrentPort)

    this._client = client

    // Temporarily store incoming connections so they can be destroyed if the server is
    // closed before the connection is passed off to a Torrent.
    this._pendingConns = new Set()

    this._onTCPConnectionBound = (conn) => {
      this._onConnection(conn, 'tcp')
    }

    this._onUTPConnectionBound = (conn) => {
      this._onConnection(conn, 'utp')
    }

    this._onListening = () => {
      this._client._onListening()
    }

    this._onTCPError = (err) => {
      this._client._destroy(err)
    }

    this._onUTPError = (err) => {
      this._client.utp = false
      this._client.emit('error', err)
      if (!this._client.listening) this._onListening()
    }

    // Setup TCP
    this.tcpServer = net.createServer()
    this.tcpServer.on('connection', this._onTCPConnectionBound)
    this.tcpServer.on('error', this._onTCPError)

    // Start TCP
    this.tcpServer.listen(client.torrentPort, () => {
      debug('creating tcpServer in port %s', this.tcpServer.address().port)
      if (this._client.utp) {
        // Setup uTP
        this.utpServer = utp.createServer()
        this.utpServer.on('connection', this._onUTPConnectionBound)
        this.utpServer.on('listening', this._onListening)
        this.utpServer.on('error', this._onUTPError)

        // Start uTP
        debug('creating utpServer in port %s', this.tcpServer.address().port)
        this.utpServer.listen(this.tcpServer.address().port)
      } else {
        this._onListening()
      }
    })
  }

  /**
   * Destroy this Conn pool.
   * @param  {function} cb
   */
  destroy (cb) {
    debug('destroy conn pool')

    if (this.utpServer) {
      this.utpServer.removeListener('connection', this._onUTPConnectionBound)
      this.utpServer.removeListener('listening', this._onListening)
      this.utpServer.removeListener('error', this._onUTPError)
    }

    this.tcpServer.removeListener('connection', this._onTCPConnectionBound)
    this.tcpServer.removeListener('error', this._onTCPError)

    // Destroy all open connection objects so server can close gracefully without waiting
    // for connection timeout or remote peer to disconnect.
    this._pendingConns.forEach((conn) => {
      conn.on('error', noop)
      conn.destroy()
    })

    if (this.utpServer) {
      try {
        this.utpServer.close(cb)
      } catch (err) {
        if (cb) queueMicrotask(cb)
      }
    }

    try {
      this.tcpServer.close(cb)
    } catch (err) {
      if (cb) queueMicrotask(cb)
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
  _onConnection (conn, type) {
    const self = this

    // If the connection has already been closed before the `connect` event is fired,
    // then `remoteAddress` will not be available, and we can't use this connection.
    // - Node.js issue: https://github.com/nodejs/node-v0.x-archive/issues/7566
    // - WebTorrent issue: https://github.com/webtorrent/webtorrent/issues/398
    if (!conn.remoteAddress) {
      conn.on('error', noop)
      conn.destroy()
      return
    }

    self._pendingConns.add(conn)
    conn.once('close', cleanupPending)

    const peer = type === 'utp'
      ? Peer.createUTPIncomingPeer(conn, this._client.throttleGroups)
      : Peer.createTCPIncomingPeer(conn, this._client.throttleGroups)

    const wire = peer.wire
    wire.once('pe3', onPe3)
    wire.once('handshake', onHandshake)

    async function onPe3 (infoHashHash) {
      const torrent = await self._client._getByHash(infoHashHash)
      if (torrent) {
        peer.swarm = torrent
        torrent._addIncomingPeer(peer)
        peer.onPe3(infoHashHash)
      } else {
        peer.destroy(new Error(`Unexpected info hash hash ${infoHashHash} from incoming peer ${peer.id}`))
      }
    }

    async function onHandshake (infoHash, peerId) {
      cleanupPending()

      const torrent = await self._client.get(infoHash)
      // only add incoming peer if didn't already do so in protocol encryption handshake
      if (torrent) {
        if (!peer.swarm) {
          peer.swarm = torrent
          torrent._addIncomingPeer(peer)
        }
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
        self._pendingConns.delete(conn)
      }
    }
  }
}

ConnPool.UTP_SUPPORT = Object.keys(utp).length > 0

function noop () {}
