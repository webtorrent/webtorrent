export default class File {
    constructor(torrent: any, file: any);
    _torrent: any;
    _destroyed: boolean;
    _fileStreams: Set<any>;
    _iterators: Set<any>;
    name: any;
    path: any;
    length: any;
    size: any;
    type: any;
    offset: any;
    done: boolean;
    _startPiece: number;
    _endPiece: number;
    _client: any;
    get downloaded(): number;
    get progress(): number;
    select(priority: any): void;
    deselect(): void;
    createReadStream(opts: any): any;
    arrayBuffer(opts?: {}): Promise<ArrayBuffer>;
    blob(opts: any): Promise<Blob>;
    stream(opts: any): ReadableStream<any>;
    get streamURL(): string;
    streamTo(elem: any): any;
    includes(piece: any): boolean;
    _destroy(): void;
    [Symbol.asyncIterator](opts?: {}): any;
}
//# sourceMappingURL=file.d.ts.map