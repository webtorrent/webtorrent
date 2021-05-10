const arrayRemove = require('unordered-array-remove')
const debug = require('debug')('webtorrent:peer')
const Wire = require('bittorrent-protocol')

const CONNECT_TIMEOUT_TCP = 5000
const CONNECT_TIMEOUT_UTP = 5000
const CONNECT_TIMEOUT_WEBRTC = 25000
const HANDSHAKE_TIMEOUT = 25000

/**
 * WebRTC peer connections start out connected, because WebRTC peers require an
 * "introduction" (i.e. WebRTC signaling), and there's no equivalent to an IP address
 * that lets you refer to a WebRTC endpoint.
 */
exports.createWebRTCPeer = (conn, swarm) => {
  const peer = new Peer(conn.id, 'webrtc')
  peer.conn = conn
  peer.swarm = swarm

  if (peer.conn.connected) {
    peer.onConnect()
  } else {
    const cleanup = () => {
      peer.conn.removeListener('connect', onConnect)
      peer.conn.removeListener('error', onError)
    }
    const onConnect = () => {
      cleanup()
      peer.onConnect()
    }
    const onError = err => {
      cleanup()
      peer.destroy(err)
    }
    peer.conn.once('connect', onConnect)
    peer.conn.once('error', onError)
    peer.startConnectTimeout()
  }

  return peer
}

/**
 * Incoming TCP peers start out connected, because the remote peer connected to the
 * listening port of the TCP server. Until the remote peer sends a handshake, we don't
 * know what swarm the connection is intended for.
 */
exports.createTCPIncomingPeer = conn => {
  return _createIncomingPeer(conn, 'tcpIncoming')
}

/**
 * Incoming uTP peers start out connected, because the remote peer connected to the
 * listening port of the uTP server. Until the remote peer sends a handshake, we don't
 * know what swarm the connection is intended for.
 */
exports.createUTPIncomingPeer = conn => {
  return _createIncomingPeer(conn, 'utpIncoming')
}

/**
 * Outgoing TCP peers start out with just an IP address. At some point (when there is an
 * available connection), the client can attempt to connect to the address.
 */
exports.createTCPOutgoingPeer = (addr, swarm) => {
  return _createOutgoingPeer(addr, swarm, 'tcpOutgoing')
}

/**
 * Outgoing uTP peers start out with just an IP address. At some point (when there is an
 * available connection), the client can attempt to connect to the address.
 */
exports.createUTPOutgoingPeer = (addr, swarm) => {
  return _createOutgoingPeer(addr, swarm, 'utpOutgoing')
}

const _createIncomingPeer = (conn, type) => {
  const addr = `${conn.remoteAddress}:${conn.remotePort}`
  const peer = new Peer(addr, type)
  peer.conn = conn
  peer.addr = addr

  peer.onConnect()

  return peer
}

const _createOutgoingPeer = (addr, swarm, type) => {
  const peer = new Peer(addr, type)
  peer.addr = addr
  peer.swarm = swarm

  return peer
}

/**
 * Peer that represents a Web Seed (BEP17 / BEP19).
 */
exports.createWebSeedPeer = (conn, id, swarm) => {
  const peer = new Peer(id, 'webSeed')
  peer.swarm = swarm
  peer.conn = conn

  peer.onConnect()

  return peer
}

/**
 * Peer. Represents a peer in the torrent swarm.
 *
 * @param {string} id "ip:port" string, peer id (for WebRTC peers), or url (for Web Seeds)
 * @param {string} type the type of the peer
 */
class Peer {
  constructor (id, type) {
    this.id = id
    this.type = type

    debug('new %s Peer %s', type, id)

    this.addr = null
    this.conn = null
    this.swarm = null
    this.wire = null

    this.connected = false
    this.destroyed = false
    this.timeout = null // handshake timeout
    this.retries = 0 // outgoing TCP connection retry count

    this.sentHandshake = false
  }

  /**
   * Called once the peer is connected (i.e. fired 'connect' event)
   * @param {Socket} conn
   */
  onConnect () {
    if (this.destroyed) return
    this.connected = true

    debug('Peer %s connected', this.id)

    clearTimeout(this.connectTimeout)

    const conn = this.conn
    conn.once('end', () => {
      this.destroy()
    })
    conn.once('close', () => {
      this.destroy()
    })
    conn.once('finish', () => {
      this.destroy()
    })
    conn.once('error', err => {
      this.destroy(err)
    })

    const wire = this.wire = new Wire()
    wire.type = this.type
    wire.once('end', () => {
      this.destroy()
    })
    wire.once('close', () => {
      this.destroy()
    })
    wire.once('finish', () => {
      this.destroy()
    })
    wire.once('error', err => {
      this.destroy(err)
    })

    wire.once('handshake', (infoHash, peerId) => {
      this.onHandshake(infoHash, peerId)
    })
    this.startHandshakeTimeout()

    conn.pipe(wire).pipe(conn)
    if (this.swarm && !this.sentHandshake) this.handshake()
  }

  /**
   * Called when handshake is received from remote peer.
   * @param {string} infoHash
   * @param {string} peerId
   */
  onHandshake (infoHash, peerId) {
    if (!this.swarm) return // `this.swarm` not set yet, so do nothing
    if (this.destroyed) return

    if (this.swarm.destroyed) {
      return this.destroy(new Error('swarm already destroyed'))
    }
    if (infoHash !== this.swarm.infoHash) {
      return this.destroy(new Error('unexpected handshake info hash for this swarm'))
    }
    if (peerId === this.swarm.peerId) {
      return this.destroy(new Error('refusing to connect to ourselves'))
    }

    debug('Peer %s got handshake %s', this.id, infoHash)

    clearTimeout(this.handshakeTimeout)

    this.retries = 0

    let addr = this.addr
    if (!addr && this.conn.remoteAddress && this.conn.remotePort) {
      addr = `${this.conn.remoteAddress}:${this.conn.remotePort}`
    }
    this.swarm._onWire(this.wire, addr)

    // swarm could be destroyed in user's 'wire' event handler
    if (!this.swarm || this.swarm.destroyed) return

    if (!this.sentHandshake) this.handshake()
  }

  handshake () {
    const opts = {
      dht: this.swarm.private ? false : !!this.swarm.client.dht
    }
    this.wire.handshake(this.swarm.infoHash, this.swarm.client.peerId, opts)
    this.sentHandshake = true
  }

  startConnectTimeout () {
    clearTimeout(this.connectTimeout)

    const connectTimeoutValues = {
      webrtc: CONNECT_TIMEOUT_WEBRTC,
      tcpOutgoing: CONNECT_TIMEOUT_TCP,
      utpOutgoing: CONNECT_TIMEOUT_UTP
    }

    this.connectTimeout = setTimeout(() => {
      this.destroy(new Error('connect timeout'))
    }, connectTimeoutValues[this.type])
    if (this.connectTimeout.unref) this.connectTimeout.unref()
  }

  startHandshakeTimeout () {
    clearTimeout(this.handshakeTimeout)
    this.handshakeTimeout = setTimeout(() => {
      this.destroy(new Error('handshake timeout'))
    }, HANDSHAKE_TIMEOUT)
    if (this.handshakeTimeout.unref) this.handshakeTimeout.unref()
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true
    this.connected = false

    debug('destroy %s %s (error: %s)', this.type, this.id, err && (err.message || err))

    clearTimeout(this.connectTimeout)
    clearTimeout(this.handshakeTimeout)

    const swarm = this.swarm
    const conn = this.conn
    const wire = this.wire

    this.swarm = null
    this.conn = null
    this.wire = null

    if (swarm && wire) {
      arrayRemove(swarm.wires, swarm.wires.indexOf(wire))
    }
    if (conn) {
      conn.on('error', () => {})
      conn.destroy()
    }
    if (wire) wire.destroy()
    if (swarm) swarm.removePeer(this.id)
  }
}
