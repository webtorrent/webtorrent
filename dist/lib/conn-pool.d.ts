/**
 * Connection Pool
 *
 * A connection pool allows multiple swarms to listen on the same TCP/UDP port and determines
 * which swarm incoming connections are intended for by inspecting the bittorrent
 * handshake that the remote peer sends.
 *
 * @param {number} port
 */
declare class ConnPool {
    constructor(client: any);
    _client: any;
    _pendingConns: Set<any>;
    _onTCPConnectionBound: (conn: any) => void;
    _onUTPConnectionBound: (conn: any) => void;
    _onListening: () => void;
    _onTCPError: (err: any) => void;
    _onUTPError: (err: any) => void;
    tcpServer: any;
    utpServer: any;
    /**
     * Destroy this Conn pool.
     * @param  {function} cb
     */
    destroy(cb: Function): void;
    /**
     * On incoming connections, we expect the remote peer to send a handshake first. Based
     * on the infoHash in that handshake, route the peer to the right swarm.
     */
    _onConnection(conn: any, type: any): void;
}
declare namespace ConnPool {
    let UTP_SUPPORT: boolean;
}
export default ConnPool;
//# sourceMappingURL=conn-pool.d.ts.map