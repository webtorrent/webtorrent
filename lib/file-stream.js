const debug = require('debug')('webtorrent:file-stream')
const stream = require('readable-stream')
const eos = require('end-of-stream')

/**
 * Readable stream of a torrent file
 *
 * @param {File} file
 * @param {Object} opts
 * @param {number} opts.start stream slice of file, starting from this byte (inclusive)
 * @param {number} opts.end stream slice of file, ending with this byte (inclusive)
 */
class FileStream extends stream.Readable {
  constructor (file, opts) {
    super(opts)

    this._torrent = file._torrent

    const start = (opts && opts.start) || 0
    const end = (opts && opts.end && opts.end < file.length)
      ? opts.end
      : file.length - 1

    const pieceLength = file._torrent.pieceLength

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

    // Ensure that cleanup happens even if destroy() is never called (readable-stream v3 currently doesn't call it automaticallly)
    eos(this, (err) => {
      this.destroy(err)
    })
  }

  _read () {
    if (this._reading) return
    this._reading = true
    this._notify()
  }

  _notify () {
    if (!this._reading || this._missing === 0) return
    if (!this._torrent.bitfield.get(this._piece)) {
      return this._torrent.critical(this._piece, this._piece + this._criticalLength)
    }

    if (this._notifying) return
    this._notifying = true

    if (this._torrent.destroyed) return this.destroy(new Error('Torrent removed'))

    const p = this._piece

    const getOpts = {}
    // Specify length for the last piece in case it is zero-padded
    if (p === this._torrent.pieces.length - 1) {
      getOpts.length = this._torrent.lastPieceLength
    }

    this._torrent.store.get(p, getOpts, (err, buffer) => {
      this._notifying = false
      if (this.destroyed) return
      debug('read %s (length %s) (err %s)', p, buffer && buffer.length, err && err.message)

      if (err) return this.destroy(err)

      if (this._offset) {
        buffer = buffer.slice(this._offset)
        this._offset = 0
      }

      if (this._missing < buffer.length) {
        buffer = buffer.slice(0, this._missing)
      }
      this._missing -= buffer.length

      debug('pushing buffer of length %s', buffer.length)
      this._reading = false
      this.push(buffer)

      if (this._missing === 0) this.push(null)
    })
    this._piece += 1
  }

  _destroy (err, cb) {
    if (!this._torrent.destroyed) {
      this._torrent.deselect(this._startPiece, this._endPiece)
    }
    cb(err)
  }
}

module.exports = FileStream
