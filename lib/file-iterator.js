import debugFactory from 'debug'
import EventEmitter from 'events'

const debug = debugFactory('webtorrent:file-iterator')

/**
 * Async iterator of a torrent file
 *
 * @param {File} file
 * @param {Object} opts
 * @param {number} opts.start iterator slice of file, starting from this byte (inclusive)
 * @param {number} opts.end iterator slice of file, ending with this byte (inclusive)
 * @implements {AsyncIterator<Uint8Array>}
 */
export default class FileIterator extends EventEmitter {
  constructor (file, { start, end }) {
    super()

    this._torrent = file._torrent

    this._pieceLength = file._torrent.pieceLength

    this._startPiece = Math.floor((start + file.offset) / this._pieceLength)
    this._endPiece = Math.floor((end + file.offset) / this._pieceLength)

    this._piece = this._startPiece
    this._offset = (start + file.offset) - (this._startPiece * this._pieceLength)

    this._missing = end - start + 1
    this._criticalLength = Math.min((1024 * 1024 / this._pieceLength) | 0, 2)

    this._torrent._select(this._startPiece, this._endPiece, 1, null, true)
    this.destroyed = false
  }

  [Symbol.asyncIterator] () {
    return this
  }

  next () {
    return new Promise((resolve, reject) => {
      if (this._missing === 0 || this.destroyed) {
      this.destroy()
      return resolve({ done: true })
      }
      const pump = (index, opts) => {
        if (this.destroyed) return resolve({ done: true })
        if (!this._torrent.bitfield.get(index)) {
          const listener = i => {
            if (i === index || this.destroyed) {
              this._torrent.removeListener('verified', listener)
              if (i === index) {
                pump(index, opts)
              } else {
                resolve({ done: true })
              }
            }
          }

          this._torrent.on('verified', listener)
          return this._torrent.critical(index, index + this._criticalLength)
        }

        this._torrent.store.get(index, opts, (err, buffer) => {
          if (this.destroyed || !this._torrent || this._torrent.destroyed) return resolve({ done: true }) // prevent hanging

          if (err || !buffer) {
            debug('read error at %s (err: %s)', index, err?.message || 'no buffer returned')
            this.destroy(undefined, err || new Error('No buffer returned'))
            return resolve({ done: true })
        }
          debug('read %s and yielding (length %s) (err %s)', index, buffer?.length, err?.message)
          // prevent re-wrapping outside of promise
          resolve({ value: buffer, done: false })
        })
      }

      const length = Math.min(this._missing, this._pieceLength - this._offset)

      pump(this._piece++, { length, offset: this._offset })
      this._missing -= length
      this._offset = 0
    })
  }

  /**
   * @returns {Promise<IteratorResult<Uint8Array>>}
   */
  async return () {
    this.destroy()
    return { done: true, value: undefined }
  }

  /**
   * @param {Error} err
   * @returns {Promise<IteratorResult<Uint8Array>>}
   */
  async throw (err) {
  this.destroy(undefined, err)
  throw err
}

  destroy (cb = () => {}, err) {
    if (this.destroyed) return
    this.destroyed = true
    if (!this._torrent.destroyed) {
      this._torrent._deselect(this._startPiece, this._endPiece, true)
    }
    this.emit('return')

    try {
    cb(err)
  } catch (e) {
    debug('Error in destroy callback: %O', e)
  }
  }
}
