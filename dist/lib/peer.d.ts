export function enableSecure(): void;
/**
 * Peer. Represents a peer in the torrent swarm.
 *
 * @param {string} id "ip:port" string, peer id (for WebRTC peers), or url (for Web Seeds)
 * @param {string} type the type of the peer
 */
declare class Peer {
    constructor(id: any, type: any);
    id: any;
    type: any;
    addr: any;
    conn: any;
    swarm: any;
    wire: any;
    source: any;
    connected: boolean;
    destroyed: boolean;
    timeout: any;
    retries: number;
    sentPe1: boolean;
    sentPe2: boolean;
    sentPe3: boolean;
    sentPe4: boolean;
    sentHandshake: boolean;
    /**
     * Called once the peer is connected (i.e. fired 'connect' event)
     * @param {Socket} conn
     */
    onConnect(): void;
    sendPe1(): void;
    onPe1(): void;
    sendPe2(): void;
    onPe2(): void;
    sendPe3(): void;
    onPe3(infoHashHash: any): void;
    sendPe4(): void;
    onPe4(): void;
    clearPipes(): void;
    setThrottlePipes(): void;
    /**
     * Called when handshake is received from remote peer.
     * @param {string} infoHash
     * @param {string} peerId
     */
    onHandshake(infoHash: string, peerId: string): void;
    handshake(): void;
    startConnectTimeout(): void;
    connectTimeout: number;
    startHandshakeTimeout(): void;
    handshakeTimeout: number;
    destroy(err: any): void;
}
declare namespace Peer {
    export { TYPE_TCP_INCOMING };
    export { TYPE_TCP_OUTGOING };
    export { TYPE_UTP_INCOMING };
    export { TYPE_UTP_OUTGOING };
    export { TYPE_WEBRTC };
    export { TYPE_WEBSEED };
    export { SOURCE_MANUAL };
    export { SOURCE_TRACKER };
    export { SOURCE_DHT };
    export { SOURCE_LSD };
    export { SOURCE_UT_PEX };
    /**
     * WebRTC peer connections start out connected, because WebRTC peers require an
     * "introduction" (i.e. WebRTC signaling), and there's no equivalent to an IP address
     * that lets you refer to a WebRTC endpoint.
     */
    export function createWebRTCPeer(conn: any, swarm: any, throttleGroups: any): Peer;
    /**
     * Incoming TCP peers start out connected, because the remote peer connected to the
     * listening port of the TCP server. Until the remote peer sends a handshake, we don't
     * know what swarm the connection is intended for.
     */
    export function createTCPIncomingPeer(conn: any, throttleGroups: any): Peer;
    /**
     * Incoming uTP peers start out connected, because the remote peer connected to the
     * listening port of the uTP server. Until the remote peer sends a handshake, we don't
     * know what swarm the connection is intended for.
     */
    export function createUTPIncomingPeer(conn: any, throttleGroups: any): Peer;
    /**
     * Outgoing TCP peers start out with just an IP address. At some point (when there is an
     * available connection), the client can attempt to connect to the address.
     */
    export function createTCPOutgoingPeer(addr: any, swarm: any, throttleGroups: any): Peer;
    /**
     * Outgoing uTP peers start out with just an IP address. At some point (when there is an
     * available connection), the client can attempt to connect to the address.
     */
    export function createUTPOutgoingPeer(addr: any, swarm: any, throttleGroups: any): Peer;
    export function _createIncomingPeer(conn: any, type: any, throttleGroups: any): Peer;
    export function _createOutgoingPeer(addr: any, swarm: any, type: any, throttleGroups: any): Peer;
    /**
     * Peer that represents a Web Seed (BEP17 / BEP19).
     */
    export function createWebSeedPeer(conn: any, id: any, swarm: any, throttleGroups: any): Peer;
}
export default Peer;
declare const TYPE_TCP_INCOMING: "tcpIncoming";
declare const TYPE_TCP_OUTGOING: "tcpOutgoing";
declare const TYPE_UTP_INCOMING: "utpIncoming";
declare const TYPE_UTP_OUTGOING: "utpOutgoing";
declare const TYPE_WEBRTC: "webrtc";
declare const TYPE_WEBSEED: "webSeed";
declare const SOURCE_MANUAL: "manual";
declare const SOURCE_TRACKER: "tracker";
declare const SOURCE_DHT: "dht";
declare const SOURCE_LSD: "lsd";
declare const SOURCE_UT_PEX: "ut_pex";
