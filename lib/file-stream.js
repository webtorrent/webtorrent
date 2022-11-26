const { Readable } = require('streamx')
const debugFactory = require('debug')

const debug = debugFactory('webtorrent:file-stream')

/**
 * Readable stream of a torrent file
 *
 * @param {File} file
 * @param {Object} opts
 * @param {number} opts.start stream slice of file, starting from this byte (inclusive)
 * @param {number} opts.end stream slice of file, ending with this byte (inclusive)
 */
class FileStream extends Readable {
  constructor (file, opts) {
    super(opts ?? {})

    this._torrent = file._torrent

    const start = (opts && opts.start) || 0
    const end = (opts && opts.end && opts.end < file.length)
      ? opts.end
      : file.length - 1

    const pieceLength = file._torrent.pieceLength
    this._readLength = Math.min(end - start, 1024 * 1024 * 10)
    this._startPiece = (start + file.offset) / pieceLength | 0
    this._endPiece = (end + file.offset) / pieceLength | 0

    this._piece = this._startPiece
    this._offset = (start + file.offset) - (this._startPiece * pieceLength)

    this._missing = end - start + 1
    this._reading = false
    this._notifying = false
    this._criticalLength = Math.min((1024 * 1024 / pieceLength) | 0, 2)

    this._torrent.select(this._startPiece, this._endPiece, true, () => {
      this._notify()
    })
  }

  _read (cb) {
    if (this._reading) return
    this._reading = true
    this._notify(cb)
  }

  _notify (cb = () => {}) {
    if (!this._reading || this._missing === 0) return cb()
    const maxPieces = Math.floor(this._readLength / this._torrent.pieceLength) | 1
    const piecesToLoad = Math.max(Math.min(maxPieces, this._endPiece - this._piece), 1)
    // check that all the pieces we need are available
    // if not mark them as critical and wait for them to be available
    for (let piece = this._piece; piece < this._piece + piecesToLoad; piece++) {
      let missingPiece = false
      if (!this._torrent.bitfield.get(piece)) {
        missingPiece = true
        this._torrent.critical(piece, piece + this._criticalLength)
      }
      if (missingPiece) {
        cb()
        return
      }
    }

    if (this._notifying) return cb()
    this._notifying = true

    if (this._torrent.destroyed) return this.destroy(new Error('Torrent removed'))

    let currentRead = Promise.resolve()
    for (let piece = this._piece; piece < this._piece + piecesToLoad; piece++) {
      const getOpts = {}
      // Specify length for the last piece in case it is zero-padded
      if (piece === this._torrent.pieces.length - 1) {
        getOpts.length = this._torrent.lastPieceLength
      }
      const read = new Promise((resolve, reject) => {
        this._torrent.store.get(piece, getOpts, (err, buffer) => {
          if (this.destroyed) return
          debug('read %s (length %s) (err %s)', piece, buffer && buffer.length, err && err.message)

          if (err) {
            reject(err)
            return this.destroy(err)
          }

          if (this._offset) {
            buffer = buffer.slice(this._offset)
            this._offset = 0
          }

          if (this._missing < buffer.length) {
            buffer = buffer.slice(0, this._missing)
          }
          resolve(buffer)
        })
      })
      currentRead = currentRead.then(() => {
        return read.then((buffer) => {
          this._missing -= buffer.length

          debug('pushing buffer of length %s', buffer.length)
          this.push(buffer)
          if (this._missing === 0) this.push(null)
        })
      })
    }
    currentRead.then(() => {
      this._notifying = false
      this._reading = false
      this._piece += piecesToLoad
      this._piece = Math.min(this._piece, this._endPiece)
      cb()
    })
  }

  _destroy (cb, err) {
    if (!this._torrent.destroyed) {
      this._torrent.deselect(this._startPiece, this._endPiece, true)
    }
    cb(err)
  }
}

module.exports = FileStream
