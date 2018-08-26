
/**
 * Mapping of torrent pieces to their respective availability in the torrent swarm. Used
 * by the torrent manager for implementing the rarest piece first selection strategy.
 */
class RarityMap {
  constructor (torrent) {
    const self = this

    self._torrent = torrent
    self._numPieces = torrent.pieces.length
    self._pieces = new Array(self._numPieces).fill(0)

    self._onWire = wire => {
      self.recalculate()
      self._initWire(wire)
    }
    self._onWireHave = index => {
      self._pieces[index] += 1
    }
    self._onWireBitfield = () => {
      self.recalculate()
    }

    self._torrent.wires.forEach(wire => {
      self._initWire(wire)
    })
    self._torrent.on('wire', self._onWire)
    self.recalculate()
  }

  /**
   * Get the index of the rarest piece. Optionally, pass a filter function to exclude
   * certain pieces (for instance, those that we already have).
   *
   * @param {function} pieceFilterFunc
   * @return {number} index of rarest piece, or -1
   */
  getRarestPiece (pieceFilterFunc) {
    let candidates = []
    let min = Infinity

    for (let i = 0; i < this._numPieces; ++i) {
      if (pieceFilterFunc && !pieceFilterFunc(i)) continue

      const availability = this._pieces[i]
      if (availability === min) {
        candidates.push(i)
      } else if (availability < min) {
        candidates = [ i ]
        min = availability
      }
    }

    if (candidates.length) {
      // if there are multiple pieces with the same availability, choose one randomly
      return candidates[Math.random() * candidates.length | 0]
    } else {
      return -1
    }
  }

  destroy () {
    const self = this
    self._torrent.removeListener('wire', self._onWire)
    self._torrent.wires.forEach(wire => {
      self._cleanupWireEvents(wire)
    })
    self._torrent = null
    self._pieces = null

    self._onWire = null
    self._onWireHave = null
    self._onWireBitfield = null
  }

  _initWire (wire) {
    const self = this

    wire._onClose = function () {
      self._cleanupWireEvents(wire)
      for (let i = 0; i < this._numPieces; ++i) {
        self._pieces[i] -= wire.peerPieces.get(i)
      }
    }

    wire.on('have', self._onWireHave)
    wire.on('bitfield', self._onWireBitfield)
    wire.once('close', wire._onClose)
  }

  /**
   * Recalculates piece availability across all peers in the torrent.
   */
  recalculate () {
    this._pieces.fill(0)

    for (const wire of this._torrent.wires) {
      for (let i = 0; i < this._numPieces; ++i) {
        this._pieces[i] += wire.peerPieces.get(i)
      }
    }
  }

  _cleanupWireEvents (wire) {
    wire.removeListener('have', this._onWireHave)
    wire.removeListener('bitfield', this._onWireBitfield)
    if (wire._onClose) wire.removeListener('close', wire._onClose)
    wire._onClose = null
  }
}

module.exports = RarityMap
