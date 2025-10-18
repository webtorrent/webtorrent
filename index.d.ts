// TypeScript definitions for WebTorrent
// Project: https://webtorrent.io/
// Definitions by: WebTorrent Contributors

import { EventEmitter } from 'events'

declare namespace WebTorrent {
  interface TorrentOptions {
    announce?: string[]
    urlList?: string[]
    path?: string
    addUID?: boolean
    rootDir?: string | null
    deselect?: boolean
    paused?: boolean
    noPeersIntervalTime?: number
    uploads?: number | boolean
  }

  interface ClientOptions {
    peerId?: Buffer | string
    nodeId?: Buffer | string
    tracker?: boolean
    dht?: boolean
    lsd?: boolean
    natUpnp?: boolean
    natPmp?: boolean
    blocklist?: string[] | string
    torrentPort?: number
    dhtPort?: number
    uploadLimit?: number
    downloadLimit?: number
  }

  interface PeerInfo {
    id: string
    addr: string
    type: string
    wire?: any
  }

  interface TorrentFile {
    name: string
    path: string
    length: number
    offset: number
    done: boolean
    downloaded: number
    
    createReadStream(opts?: { start?: number; end?: number }): NodeJS.ReadableStream
    getBuffer(callback: (err: Error | null, buffer?: Buffer) => void): void
    getBlobURL(callback: (err: Error | null, url?: string) => void): void
    streamTo(elem: HTMLElement, callback?: (err: Error | null) => void): void
  }

  class Torrent extends EventEmitter {
    readonly infoHash: string
    readonly magnetURI: string
    readonly name: string
    readonly comment: string
    readonly created: Date
    readonly createdBy: string
    readonly files: TorrentFile[]
    readonly length: number
    readonly pieceLength: number
    readonly lastPieceLength: number
    readonly pieces: Buffer[]
    readonly timeRemaining: number
    readonly received: number
    readonly downloaded: number
    readonly uploaded: number
    readonly downloadSpeed: number
    readonly uploadSpeed: number
    readonly progress: number
    readonly ratio: number
    readonly numPeers: number
    readonly path: string
    readonly ready: boolean
    readonly paused: boolean
    readonly done: boolean
    readonly destroyed: boolean

    select(start: number, end: number, priority?: number, notify?: () => void): void
    deselect(start: number, end: number, priority?: number): void
    critical(start: number, end: number): void
    addPeer(peer: string | PeerInfo): boolean
    removePeer(peer: string | PeerInfo): void
    addWebSeed(url: string): void
    removeWebSeed(url: string): void
    pause(): void
    resume(): void
    destroy(opts?: { destroyStore?: boolean }, callback?: (err: Error | null) => void): void
    destroy(callback?: (err: Error | null) => void): void

    // Events
    on(event: 'infoHash', listener: () => void): this
    on(event: 'metadata', listener: () => void): this
    on(event: 'ready', listener: () => void): this
    on(event: 'done', listener: () => void): this
    on(event: 'download', listener: (bytes: number) => void): this
    on(event: 'upload', listener: (bytes: number) => void): this
    on(event: 'wire', listener: (wire: any) => void): this
    on(event: 'noPeers', listener: (announceType: string) => void): this
    on(event: 'error', listener: (err: Error) => void): this
    on(event: 'warning', listener: (err: Error) => void): this
  }

  class WebTorrent extends EventEmitter {
    readonly peerId: Buffer
    readonly nodeId: Buffer
    readonly torrents: Torrent[]
    readonly ratio: number
    readonly downloadSpeed: number
    readonly uploadSpeed: number
    readonly progress: number

    constructor(opts?: ClientOptions)

    add(torrentId: string | Buffer | File | any, opts?: TorrentOptions): Torrent
    add(torrentId: string | Buffer | File | any, opts: TorrentOptions, callback: (torrent: Torrent) => void): Torrent
    add(torrentId: string | Buffer | File | any, callback: (torrent: Torrent) => void): Torrent

    seed(input: Buffer | File[] | FileList, opts?: TorrentOptions): Torrent
    seed(input: Buffer | File[] | FileList, opts: TorrentOptions, callback: (torrent: Torrent) => void): Torrent
    seed(input: Buffer | File[] | FileList, callback: (torrent: Torrent) => void): Torrent

    remove(torrentId: string | Buffer | Torrent, opts?: { destroyStore?: boolean }, callback?: (err: Error | null) => void): void
    remove(torrentId: string | Buffer | Torrent, callback?: (err: Error | null) => void): void

    get(torrentId: string | Buffer): Torrent | null

    destroy(callback?: (err: Error | null) => void): void

    // Events
    on(event: 'torrent', listener: (torrent: Torrent) => void): this
    on(event: 'error', listener: (err: Error) => void): this
  }
}

export = WebTorrent.WebTorrent
export as namespace WebTorrent