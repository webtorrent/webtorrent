/**
 * Mapping of torrent pieces to their respective availability in the torrent swarm. Used
 * by the torrent manager for implementing the rarest piece first selection strategy.
 */
export default class RarityMap {
    constructor(torrent: any);
    _torrent: any;
    _numPieces: any;
    _pieces: any[];
    _onWire: (wire: any) => void;
    _onWireHave: (index: any) => void;
    _onWireBitfield: () => void;
    /**
     * Get the index of the rarest piece. Optionally, pass a filter function to exclude
     * certain pieces (for instance, those that we already have).
     *
     * @param {function} pieceFilterFunc
     * @return {number} index of rarest piece, or -1
     */
    getRarestPiece(pieceFilterFunc: Function): number;
    destroy(): void;
    _initWire(wire: any): void;
    /**
     * Recalculates piece availability across all peers in the torrent.
     */
    recalculate(): void;
    _cleanupWireEvents(wire: any): void;
}
//# sourceMappingURL=rarity-map.d.ts.map