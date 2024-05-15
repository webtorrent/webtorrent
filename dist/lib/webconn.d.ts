/**
 * Converts requests for torrent blocks into http range requests.
 * @param {string} url web seed url
 * @param {Object} torrent
 */
export default class WebConn {
    constructor(url: any, torrent: any);
    url: any;
    connId: any;
    _torrent: any;
    _init(url: any): void;
    httpRequest(pieceIndex: any, offset: any, length: any, cb: any): Promise<any>;
    destroy(): void;
}
