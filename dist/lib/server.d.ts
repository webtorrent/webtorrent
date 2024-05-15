export class NodeServer extends ServerBase {
    constructor(client: any, opts: any);
    server: any;
    _listen: any;
    _close: any;
    sockets: Set<any>;
    pathname: any;
    wrapRequest(req: any, res: any): any;
    onConnection(socket: any): void;
    address(): any;
    listen(...args: any[]): any;
    destroy(cb: any): void;
}
export class BrowserServer extends ServerBase {
    constructor(client: any, opts: any);
    registration: any;
    workerKeepAliveInterval: number;
    workerPortCount: number;
    pathname: string;
    _address: {
        port: string;
        family: string;
        address: string;
    };
    boundHandler: any;
    wrapRequest(event: any): any;
    listen(_: any, cb: any): void;
    address(): {
        port: string;
        family: string;
        address: string;
    };
    close(cb: any): void;
    destroy(cb: any): void;
}
declare class ServerBase {
    static serveIndexPage(res: any, torrents: any, pathname: any): any;
    static serveMethodNotAllowed(res: any): any;
    static serve404Page(res: any): any;
    static serveTorrentPage(torrent: any, res: any, pathname: any): any;
    static serveOptionsRequest(req: any, res: any): any;
    static serveFile(file: any, req: any, res: any): any;
    constructor(client: any, opts?: {});
    client: any;
    opts: {};
    pendingReady: Set<any>;
    isOriginAllowed(req: any): boolean;
    onRequest(req: any, cb: any): Promise<any>;
    close(cb?: () => void): void;
    closed: boolean;
    destroy(cb?: () => void): void;
}
export {};
