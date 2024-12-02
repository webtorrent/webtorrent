export default class Torrent {
    constructor(torrentId: any, client: any, opts: any);
    _debugId: string;
    client: any;
    announce: any;
    urlList: any;
    path: any;
    addUID: any;
    rootDir: any;
    skipVerify: boolean;
    _store: any;
    _preloadedStore: any;
    _storeCacheSlots: any;
    _destroyStoreOnDestroy: any;
    store: any;
    storeOpts: any;
    alwaysChokeSeeders: any;
    _getAnnounceOpts: any;
    private: any;
    strategy: any;
    maxWebConns: any;
    _rechokeNumSlots: number;
    _rechokeOptimisticWire: any;
    _rechokeOptimisticTime: number;
    _rechokeIntervalId: NodeJS.Timeout | null;
    _noPeersIntervalId: NodeJS.Timeout | null;
    _noPeersIntervalTime: number;
    _startAsDeselected: any;
    ready: boolean;
    destroyed: boolean;
    paused: any;
    done: boolean;
    metadata: any;
    files: any[];
    pieces: any[];
    _amInterested: boolean;
    _selections: Selections;
    _critical: any[];
    wires: any[];
    _queue: any[];
    _peers: {};
    _peersLength: number;
    received: number;
    uploaded: number;
    _downloadSpeed: any;
    _uploadSpeed: any;
    _servers: any[];
    _xsRequests: any[];
    _fileModtimes: any;
    get timeRemaining(): number;
    get downloaded(): number;
    get downloadSpeed(): any;
    get uploadSpeed(): any;
    get progress(): number;
    get ratio(): number;
    get numPeers(): number;
    get torrentFileBlob(): Blob | null;
    get _numQueued(): number;
    get _numConns(): number;
    _onTorrentId(torrentId: any): Promise<void>;
    infoHash: any;
    _onParsedTorrent(parsedTorrent: any): any;
    _processParsedTorrent(parsedTorrent: any): void;
    magnetURI: any;
    torrentFile: any;
    _onListening(): void;
    _startDiscovery(): void;
    discovery: any;
    _getMetadataFromServer(): void;
    _xsRequestsController: AbortController | null | undefined;
    /**
     * Called when the full torrent metadata is received.
     */
    _onMetadata(metadata: any): Promise<any>;
    _rarityMap: RarityMap | null | undefined;
    _hashes: any[] | undefined;
    _reservations: never[][] | undefined;
    bitfield: BitField | undefined;
    getFileModtimes(cb: any): void;
    _verifyPieces(cb: any): void;
    rescanFiles(cb: any): void;
    _markAllVerified(): void;
    _markVerified(index: any): void;
    _markUnverified(index: any): void;
    _hasAllPieces(): boolean;
    _hasNoPieces(): boolean;
    _hasMorePieces(threshold: any): boolean;
    /**
     * Called when the metadata, listening server, and underlying chunk store is initialized.
     */
    _onStore(): void;
    destroy(opts: any, cb: any): any;
    _destroy(err: any, opts: any, cb: any): any;
    addPeer(peer: any, source: any): boolean;
    _addPeer(peer: any, type: any, source: any): Peer | null;
    addWebSeed(urlOrConn: any): void;
    /**
     * Called whenever a new incoming TCP peer connects to this torrent swarm. Called with a
     * peer that has already sent a handshake.
     */
    _addIncomingPeer(peer: any): any;
    _registerPeer(newPeer: any): void;
    removePeer(peer: any): void;
    _select(start: any, end: any, priority: any, notify: any, isStreamSelection?: boolean): void;
    select(start: any, end: any, priority: any, notify: any): void;
    _deselect(from: any, to: any, isStreamSelection?: boolean): void;
    deselect(start: any, end: any): void;
    critical(start: any, end: any): void;
    _onWire(wire: any, addr: any): void;
    _onWireWithMetadata(wire: any): void;
    /**
     * Called on selection changes.
     */
    _updateSelections(): void;
    /**
     * Garbage collect selections with respect to the store's current state.
     */
    _gcSelections(): void;
    /**
     * Update interested status for all peers.
     */
    _updateInterest(): void;
    _updateWireInterest(wire: any): void;
    /**
     * Heartbeat to update all peers and their requests.
     */
    _update(): void;
    _updateWireWrapper(): void;
    /**
     * Attempts to update a peer's requests
     */
    _updateWire(wire: any): false | void;
    /**
     * Called periodically to update the choked status of all peers, handling optimistic
     * unchoking as described in BEP3.
     */
    _rechoke(): void;
    /**
     * Attempts to cancel a slow block request from another wire such that the
     * given wire may effectively swap out the request for one of its own.
     */
    _hotswap(wire: any, index: any): boolean;
    /**
     * Attempts to request a block from the given wire.
     */
    _request(wire: any, index: any, hotswap: any): boolean;
    _checkDone(): boolean | undefined;
    load(streams: any, cb: any): Promise<any>;
    pause(): void;
    resume(): void;
    _debug(...args: any[]): void;
    /**
     * Pop a peer off the FIFO queue and connect to it. When _drain() gets called,
     * the queue will usually have only one peer in it, except when there are too
     * many peers (over `this.maxConns`) in which case they will just sit in the
     * queue until another connection closes.
     */
    _drain(): void;
    /**
     * Returns `true` if string is valid IPv4/6 address.
     * @param {string} addr
     * @return {boolean}
     */
    _validAddr(addr: string): boolean;
    /**
     * Return `true` if string is a valid IPv4 address.
     * @param {string} addr
     * @return {boolean}
     */
    _isIPv4(addr: string): boolean;
}
import { Selections } from './selections.js';
import RarityMap from './rarity-map.js';
import BitField from 'bitfield';
import Peer from './peer.js';
//# sourceMappingURL=torrent.d.ts.map