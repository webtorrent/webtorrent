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
 */
export default class FileIterator extends EventEmitter {
  constructor (file, { start, end }) {
    super()

    this._torrent = file._torrent

    this._pieceLength = file._torrent.pieceLength

    this._startPiece = (start + file.offset) / this._pieceLength | 0
    this._endPiece = (end + file.offset) / this._pieceLength | 0

    this._piece = this._startPiece
    this._offset = (start + file.offset) - (this._startPiece * this._pieceLength)

    this._missing = end - start + 1
    this._criticalLength = Math.min((1024 * 1024 / this._pieceLength) | 0, 2)

    this._torrent.select(this._startPiece, this._endPiece, true, () => {
      this.emit('_notify')
    })
    this.destroyed = false
  }

  [Symbol.asyncIterator] () {
    return this
  }

  next () {
    return new Promise((resolve, reject) => {
      if (this._missing === 0) {
        resolve({ done: true })
        return this.destroy()
      }
      const pump = (index, opts) => {
        if (!this._torrent.bitfield.get(index)) {
          this._torrent.critical(index, index + this._criticalLength)
          const listener = () => {
            if (this._torrent.bitfield.get(index)) {
              this.removeListener('_notify', listener)
              pump(index, opts)
            }
          }
          return this.on('_notify', listener)
        }

        if (this._torrent.destroyed) return reject(new Error('Torrent removed'))

        this._torrent.store.get(index, opts, (err, buffer) => {
          if (this.destroyed) return resolve({ done: true }) // prevent hanging
          debug('read %s and yielding (length %s) (err %s)', index, buffer?.length, err?.message)

          if (err) return reject(err)

          // prevent re-wrapping outside of promise
          resolve({ value: buffer, done: false })
        })
      }

      const length = Math.min(this._missing, this._pieceLength) - this._offset

      pump(this._piece++, { length, offset: this._offset })
      this._missing -= length
      this._offset = 0
    })
  }

  async return () {
    this.destroy()
    const { value } = await this.next()
    return { done: true, value }
  }

  async throw (err) {
    throw err
  }

  destroy (cb = () => {}, err) {
    if (this.destroyed) return
    this.destroyed = true
    if (!this._torrent.destroyed) {
      this._torrent.deselect(this._startPiece, this._endPiece, true)
    }
    this.emit('return')
    cb(err)
  }
}
