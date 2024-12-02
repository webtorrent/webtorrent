/**
 * Async iterator of a torrent file
 *
 * @param {File} file
 * @param {Object} opts
 * @param {number} opts.start iterator slice of file, starting from this byte (inclusive)
 * @param {number} opts.end iterator slice of file, ending with this byte (inclusive)
 */
export default class FileIterator {
    constructor(file: any, { start, end }: {
        start: any;
        end: any;
    });
    _torrent: any;
    _pieceLength: any;
    _startPiece: number;
    _endPiece: number;
    _piece: number;
    _offset: number;
    _missing: number;
    _criticalLength: number;
    destroyed: boolean;
    next(): Promise<any>;
    return(): Promise<{
        done: boolean;
    }>;
    throw(err: any): Promise<void>;
    destroy(cb: () => void, err: any): void;
    [Symbol.asyncIterator](): this;
}
//# sourceMappingURL=file-iterator.d.ts.map