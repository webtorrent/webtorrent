/**
 * WebTorrent Client
 * @param {Object=} opts
 */
declare class WebTorrent {
    constructor(opts?: {});
    peerId: any;
    peerIdBuffer: Uint8Array;
    nodeId: any;
    nodeIdBuffer: Uint8Array;
    _debugId: any;
    destroyed: boolean;
    listening: boolean;
    torrentPort: any;
    dhtPort: any;
    tracker: any;
    lsd: boolean;
    utPex: boolean;
    natUpnp: any;
    natPmp: any;
    torrents: any[];
    maxConns: number;
    utp: boolean;
    _downloadLimit: number;
    _uploadLimit: number;
    natTraversal: any;
    throttleGroups: {
        down: any;
        up: any;
    };
    _connPool: ConnPool;
    _downloadSpeed: any;
    _uploadSpeed: any;
    dht: any;
    enableWebSeeds: boolean;
    ready: boolean;
    blocked: any;
    /**
     * Creates an http server to serve the contents of this torrent,
     * dynamically fetching the needed torrent pieces to satisfy http requests.
     * Range requests are supported.
     *
     * @param {Object} options
     * @param {String} force
     * @return {BrowserServer||NodeServer}
     */
    createServer(options: any, force: string): BrowserServer;
    _server: NodeServer | BrowserServer;
    get downloadSpeed(): any;
    get uploadSpeed(): any;
    get progress(): number;
    get ratio(): number;
    /**
     * Returns the torrent with the given `torrentId`. Convenience method. Easier than
     * searching through the `client.torrents` array. Returns `null` if no matching torrent
     * found.
     *
     * @param  {string|Buffer|Object|Torrent} torrentId
     * @return {Promise<Torrent|null>}
     */
    get(torrentId: string | Buffer | any | Torrent): Promise<Torrent | null>;
    /**
     * Start downloading a new torrent. Aliased as `client.download`.
     * @param {string|Buffer|Object} torrentId
     * @param {Object} opts torrent-specific options
     * @param {function=} ontorrent called when the torrent is ready (has metadata)
     */
    add(torrentId: string | Buffer | any, opts?: any, ontorrent?: Function | undefined): Torrent;
    /**
     * Start seeding a new file/folder.
     * @param  {string|File|FileList|Buffer|Array.<string|File|Buffer>} input
     * @param  {Object=} opts
     * @param  {function=} onseed called when torrent is seeding
     */
    seed(input: string | File | FileList | Buffer | Array<string | File | Buffer>, opts?: any | undefined, onseed?: Function | undefined): Torrent;
    /**
     * Remove a torrent from the client.
     * @param  {string|Buffer|Torrent}   torrentId
     * @param  {function} cb
     */
    remove(torrentId: string | Buffer | Torrent, opts: any, cb: Function): any;
    _remove(torrent: any, opts: any, cb: any): any;
    address(): any;
    /**
     * Set global download throttle rate.
     * @param  {Number} rate (must be bigger or equal than zero, or -1 to disable throttling)
     */
    throttleDownload(rate: number): any;
    /**
     * Set global upload throttle rate
     * @param  {Number} rate (must be bigger or equal than zero, or -1 to disable throttling)
     */
    throttleUpload(rate: number): any;
    /**
     * Destroy the client, including all torrents and connections to peers.
     * @param  {function} cb
     */
    destroy(cb: Function): void;
    _destroy(err: any, cb: any): void;
    _onListening(): void;
    _debug(...args: any[]): void;
    _getByHash(infoHashHash: any): Promise<any>;
}
declare namespace WebTorrent {
    export let WEBRTC_SUPPORT: any;
    export let UTP_SUPPORT: boolean;
    export { VERSION };
}
export default WebTorrent;
import ConnPool from './lib/conn-pool.js';
import { BrowserServer } from './lib/server.js';
import { NodeServer } from './lib/server.js';
import Torrent from './lib/torrent.js';
declare const VERSION: any;
