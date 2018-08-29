const { EventEmitter } = require('events')
const { PassThrough } = require('readable-stream')
const eos = require('end-of-stream')
const path = require('path')
const render = require('render-media')
const streamToBlob = require('stream-to-blob')
const streamToBlobURL = require('stream-to-blob-url')
const streamToBuffer = require('stream-with-known-length-to-buffer')
const FileStream = require('./file-stream')

class File extends EventEmitter {
  constructor (torrent, file) {
    super()

    this._torrent = torrent
    this._destroyed = false

    this.name = file.name
    this.path = file.path
    this.length = file.length
    this.offset = file.offset

    this.done = false

    const start = file.offset
    const end = start + file.length - 1

    this._startPiece = start / this._torrent.pieceLength | 0
    this._endPiece = end / this._torrent.pieceLength | 0

    if (this.length === 0) {
      this.done = true
      this.emit('done')
    }
  }

  get downloaded () {
    if (!this._torrent.bitfield) return 0

    const { pieces, bitfield, pieceLength } = this._torrent
    const { _startPiece: start, _endPiece: end } = this
    const piece = pieces[start]

    // Calculate first piece diffrently, it sometimes have a offset
    let downloaded = bitfield.get(start)
      ? pieceLength - this.offset
      : Math.max(piece.length - piece.missing - this.offset, 0)

    for (let index = start + 1; index <= end; ++index) {
      if (bitfield.get(index)) {
        // verified data
        downloaded += pieceLength
      } else {
        // "in progress" data
        const piece = pieces[index]
        downloaded += piece.length - piece.missing
      }
    }

    // We don't have a end-offset and one small file can fith in the middle
    // of one chunk, so return this.length if it's oversized
    return Math.min(downloaded, this.length)
  }

  get progress () {
    return this.length ? this.downloaded / this.length : 0
  }

  select (priority) {
    if (this.length === 0) return
    this._torrent.select(this._startPiece, this._endPiece, priority)
  }

  deselect () {
    if (this.length === 0) return
    this._torrent.deselect(this._startPiece, this._endPiece, false)
  }

  createReadStream (opts) {
    if (this.length === 0) {
      const empty = new PassThrough()
      process.nextTick(() => {
        empty.end()
      })
      return empty
    }

    const fileStream = new FileStream(this, opts)
    this._torrent.select(fileStream._startPiece, fileStream._endPiece, true, () => {
      fileStream._notify()
    })
    eos(fileStream, () => {
      if (this._destroyed) return
      if (!this._torrent.destroyed) {
        this._torrent.deselect(fileStream._startPiece, fileStream._endPiece, true)
      }
    })
    return fileStream
  }

  getBuffer (cb) {
    streamToBuffer(this.createReadStream(), this.length, cb)
  }

  getBlob (cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    streamToBlob(this.createReadStream(), this._getMimeType(), cb)
  }

  getBlobURL (cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    streamToBlobURL(this.createReadStream(), this._getMimeType(), cb)
  }

  appendTo (elem, opts, cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    render.append(this, elem, opts, cb)
  }

  renderTo (elem, opts, cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    render.render(this, elem, opts, cb)
  }

  _getMimeType () {
    return render.mime[path.extname(this.name).toLowerCase()]
  }

  _destroy () {
    this._destroyed = true
    this._torrent = null
  }
}

module.exports = File
