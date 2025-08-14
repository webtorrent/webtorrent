import EventEmitter from 'events'
import { Transform, pipeline } from 'streamx'
import arrayRemove from 'unordered-array-remove'
import debugFactory from 'debug'
import Wire from 'bittorrent-protocol'

const CONNECT_TIMEOUT_TCP = 5_000
const CONNECT_TIMEOUT_UTP = 5_000
const CONNECT_TIMEOUT_WEBRTC = 25_000
const HANDSHAKE_TIMEOUT = 25_000

// Types of peers
const TYPE_TCP_INCOMING = 'tcpIncoming'
const TYPE_TCP_OUTGOING = 'tcpOutgoing'
const TYPE_UTP_INCOMING = 'utpIncoming'
const TYPE_UTP_OUTGOING = 'utpOutgoing'
const TYPE_WEBRTC = 'webrtc'
const TYPE_WEBSEED = 'webSeed'

// Source used to obtain the peer
const SOURCE_MANUAL = 'manual'
const SOURCE_TRACKER = 'tracker'
const SOURCE_DHT = 'dht'
const SOURCE_LSD = 'lsd'
const SOURCE_UT_PEX = 'ut_pex'

const debug = debugFactory('webtorrent:peer')

let secure = false

export const enableSecure = () => {
  secure = true
}

/**
 * Peer. Represents a peer in the torrent swarm.
 *
 * @param {string} id "ip:port" string, peer id (for WebRTC peers), or url (for Web Seeds)
 * @param {string} type the type of the peer
 */
export default class Peer extends EventEmitter {
  constructor (id, type) {
    super()

    this.id = id
    this.type = type

    debug('new %s Peer %s', type, id)

    this.addr = null
    this.conn = null
    this.swarm = null
    this.wire = null
    this.source = null

    this.connected = false
    this.destroyed = false
    this.timeout = null // handshake timeout
    this.retries = 0 // outgoing TCP connection retry count

    this.sentPe1 = false
    this.sentPe2 = false
    this.sentPe3 = false
    this.sentPe4 = false
    this.sentHandshake = false
  }

  /**
   * Called once the peer is connected (i.e. fired 'connect' event)
   * @param {Socket} conn
   */
  onConnect () {
    if (this.destroyed) return
    this.connected = true
    this.emit('connect')

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

    const wire = this.wire = new Wire(this.type, this.retries, secure)

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

    wire.once('pe1', () => {
      this.onPe1()
    })
    wire.once('pe2', () => {
      this.onPe2()
    })
    wire.once('pe3', () => {
      this.onPe3()
    })
    wire.once('pe4', () => {
      this.onPe4()
    })
    wire.once('handshake', (infoHash, peerId) => {
      this.onHandshake(infoHash, peerId)
    })
    this.startHandshakeTimeout()

    this.setThrottlePipes()

    if (this.swarm) {
      if (this.type === 'tcpOutgoing') {
        if (secure && this.retries === 0 && !this.sentPe1) this.sendPe1()
        else if (!this.sentHandshake) this.handshake()
      } else if (this.type !== 'tcpIncoming' && !this.sentHandshake) this.handshake()
    }
  }

  sendPe1 () {
    this.wire.sendPe1()
    this.sentPe1 = true
  }

  onPe1 () {
    this.sendPe2()
  }

  sendPe2 () {
    this.wire.sendPe2()
    this.sentPe2 = true
  }

  onPe2 () {
    this.sendPe3()
  }

  sendPe3 () {
    this.wire.sendPe3(this.swarm.infoHash)
    this.sentPe3 = true
  }

  onPe3 (infoHashHash) {
    if (this.swarm) {
      if (this.swarm.infoHashHash !== infoHashHash) {
        this.destroy(new Error('unexpected crypto handshake info hash for this swarm'))
      }
      this.sendPe4()
    }
  }

  sendPe4 () {
    this.wire.sendPe4(this.swarm.infoHash)
    this.sentPe4 = true
  }

  onPe4 () {
    if (!this.sentHandshake) this.handshake()
  }

  clearPipes () {
    this.conn.unpipe()
    this.wire.unpipe()
  }

  setThrottlePipes () {
    const self = this
    pipeline(
      this.conn,
      this.throttleGroups.down.throttle(),
      new Transform({
        transform (chunk, callback) {
          self.emit('download', chunk.length)
          if (self.destroyed) return
          callback(null, chunk)
        }
      }),
      this.wire,
      this.throttleGroups.up.throttle(),
      new Transform({
        transform (chunk, callback) {
          self.emit('upload', chunk.length)
          if (self.destroyed) return
          callback(null, chunk)
        }
      }),
      this.conn
    )
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
      dht: this.swarm.private ? false : !!this.swarm.client.dht,
      fast: true
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
    if (this.connected) this.emit('disconnect', err)
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

Peer.TYPE_TCP_INCOMING = TYPE_TCP_INCOMING
Peer.TYPE_TCP_OUTGOING = TYPE_TCP_OUTGOING
Peer.TYPE_UTP_INCOMING = TYPE_UTP_INCOMING
Peer.TYPE_UTP_OUTGOING = TYPE_UTP_OUTGOING
Peer.TYPE_WEBRTC = TYPE_WEBRTC
Peer.TYPE_WEBSEED = TYPE_WEBSEED

Peer.SOURCE_MANUAL = SOURCE_MANUAL
Peer.SOURCE_TRACKER = SOURCE_TRACKER
Peer.SOURCE_DHT = SOURCE_DHT
Peer.SOURCE_LSD = SOURCE_LSD
Peer.SOURCE_UT_PEX = SOURCE_UT_PEX

/**
 * WebRTC peer connections start out connected, because WebRTC peers require an
 * "introduction" (i.e. WebRTC signaling), and there's no equivalent to an IP address
 * that lets you refer to a WebRTC endpoint.
 */
Peer.createWebRTCPeer = (conn, swarm, throttleGroups, source = null) => {
  const peer = new Peer(conn.id, 'webrtc')
  peer.conn = conn
  peer.swarm = swarm
  peer.throttleGroups = throttleGroups
  peer.source = source

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
Peer.createTCPIncomingPeer = (conn, throttleGroups) => {
  return Peer._createIncomingPeer(conn, TYPE_TCP_INCOMING, throttleGroups)
}

/**
 * Incoming uTP peers start out connected, because the remote peer connected to the
 * listening port of the uTP server. Until the remote peer sends a handshake, we don't
 * know what swarm the connection is intended for.
 */
Peer.createUTPIncomingPeer = (conn, throttleGroups) => {
  return Peer._createIncomingPeer(conn, TYPE_UTP_INCOMING, throttleGroups)
}

/**
 * Outgoing TCP peers start out with just an IP address. At some point (when there is an
 * available connection), the client can attempt to connect to the address.
 */
Peer.createTCPOutgoingPeer = (addr, swarm, throttleGroups, source) => {
  return Peer._createOutgoingPeer(addr, swarm, TYPE_TCP_OUTGOING, throttleGroups, source)
}

/**
 * Outgoing uTP peers start out with just an IP address. At some point (when there is an
 * available connection), the client can attempt to connect to the address.
 */
Peer.createUTPOutgoingPeer = (addr, swarm, throttleGroups, source) => {
  return Peer._createOutgoingPeer(addr, swarm, TYPE_UTP_OUTGOING, throttleGroups, source)
}

Peer._createIncomingPeer = (conn, type, throttleGroups) => {
  const addr = `${conn.remoteAddress}:${conn.remotePort}`
  const peer = new Peer(addr, type)
  peer.conn = conn
  peer.addr = addr
  peer.throttleGroups = throttleGroups

  peer.onConnect()

  return peer
}

Peer._createOutgoingPeer = (addr, swarm, type, throttleGroups, source = null) => {
  const peer = new Peer(addr, type)
  peer.addr = addr
  peer.swarm = swarm
  peer.throttleGroups = throttleGroups
  peer.source = source

  return peer
}

/**
 * Peer that represents a Web Seed (BEP17 / BEP19).
 */

Peer.createWebSeedPeer = (conn, id, swarm, throttleGroups) => {
  const peer = new Peer(id, TYPE_WEBSEED)

  peer.swarm = swarm
  peer.conn = conn
  peer.throttleGroups = throttleGroups

  peer.onConnect()

  return peer
}
