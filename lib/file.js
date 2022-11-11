import EventEmitter from 'events'
import { PassThrough } from 'streamx'
import { BlobWriteStream } from 'fast-blob-stream'
import streamToBuffer from 'stream-with-known-length-to-buffer'
import queueMicrotask from 'queue-microtask'
import mime from 'mime'
import FileStream from './file-stream.js'

export default class File extends EventEmitter {
  constructor (torrent, file) {
    super()

    this._torrent = torrent
    this._destroyed = false
    this._fileStreams = new Set()

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

    this._server = torrent.client._server
  }

  get downloaded () {
    if (this._destroyed || !this._torrent.bitfield) return 0

    const { pieces, bitfield, pieceLength, lastPieceLength } = this._torrent
    const { _startPiece: start, _endPiece: end } = this

    const getPieceLength = (pieceIndex) => (
      pieceIndex === pieces.length - 1 ? lastPieceLength : pieceLength
    )

    const getPieceDownloaded = (pieceIndex) => {
      const len = pieceIndex === pieces.length - 1 ? lastPieceLength : pieceLength
      if (bitfield.get(pieceIndex)) {
        // verified data
        return len
      } else {
        // "in progress" data
        return len - pieces[pieceIndex].missing
      }
    }

    let downloaded = 0
    for (let index = start; index <= end; index += 1) {
      const pieceDownloaded = getPieceDownloaded(index)
      downloaded += pieceDownloaded

      if (index === start) {
        // First piece may have an offset, e.g. irrelevant bytes from the end of
        // the previous file
        const irrelevantFirstPieceBytes = this.offset % pieceLength
        downloaded -= Math.min(irrelevantFirstPieceBytes, pieceDownloaded)
      }

      if (index === end) {
        // Last piece may have an offset, e.g. irrelevant bytes from the start
        // of the next file
        const irrelevantLastPieceBytes = getPieceLength(end) - (this.offset + this.length) % pieceLength
        downloaded -= Math.min(irrelevantLastPieceBytes, pieceDownloaded)
      }
    }

    return downloaded
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
      queueMicrotask(() => {
        empty.end()
      })
      return empty
    }

    const fileStream = new FileStream(this, opts)

    this._fileStreams.add(fileStream)
    fileStream.once('close', () => {
      this._fileStreams.delete(fileStream)
    })

    return fileStream
  }

  getBuffer (cb) {
    streamToBuffer(this.createReadStream(), this.length, cb)
  }

  getBlob (cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    const writeStream = new BlobWriteStream(blob => {
      cb(null, blob)
    }, { mimeType: mime.getType(this.name) || 'application/octet-stream' })
    this.createReadStream().pipe(writeStream)
  }

  getBlobURL (cb) {
    this.getBlob((_err, blob) => {
      cb(null, URL.createObjectURL(blob))
    })
  }

  getStreamURL () {
    if (!this._server) throw new Error('No server created')
    const url = `${this._server.pathname}/${this._torrent.infoHash}/${encodeURI(this.path)}`
    return url
  }

  streamTo (elem) {
    elem.src = this.getStreamURL()
    return elem
  }

  includes (piece) {
    return this._startPiece <= piece && this._endPiece >= piece
  }

  _destroy () {
    this._destroyed = true
    this._torrent = null

    for (const fileStream of this._fileStreams) {
      fileStream.destroy()
    }
    this._fileStreams.clear()
  }
}
