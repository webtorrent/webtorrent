const EventEmitter = require('node:events')
const { PassThrough } = require('node:stream')
const path = require('node:path')
const render = require('render-media')
const streamToBlob = require('stream-to-blob')
const streamToBlobURL = require('stream-to-blob-url')
const streamToBuffer = require('stream-with-known-length-to-buffer')
const queueMicrotask = require('queue-microtask')
const rangeParser = require('range-parser')
const mime = require('mime')
const eos = require('end-of-stream')
const FileStream = require('./file-stream.js')

class File extends EventEmitter {
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

    this._serviceWorker = torrent.client.serviceWorker
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
    streamToBlob(this.createReadStream(), this._getMimeType())
      .then(
        blob => cb(null, blob),
        err => cb(err)
      )
  }

  getBlobURL (cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    streamToBlobURL(this.createReadStream(), this._getMimeType())
      .then(
        blobUrl => cb(null, blobUrl),
        err => cb(err)
      )
  }

  appendTo (elem, opts, cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    render.append(this, elem, opts, cb)
  }

  renderTo (elem, opts, cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    render.render(this, elem, opts, cb)
  }

  _serve (req) {
    const res = {
      status: 200,
      headers: {
        // Support range-requests
        'Accept-Ranges': 'bytes',
        'Content-Type': mime.getType(this.name),
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Expires: '0'
      },
      body: req.method === 'HEAD' ? '' : 'STREAM'
    }
    // force the browser to download the file if if it's opened in a new tab
    if (req.destination === 'document') {
      res.headers['Content-Type'] = 'application/octet-stream'
      res.headers['Content-Disposition'] = 'attachment'
      res.body = 'DOWNLOAD'
    }

    // `rangeParser` returns an array of ranges, or an error code (number) if
    // there was an error parsing the range.
    let range = rangeParser(this.length, req.headers.range || '')

    if (range.constructor === Array) {
      res.status = 206 // indicates that range-request was understood

      // no support for multi-range request, just use the first range
      range = range[0]

      res.headers['Content-Range'] = `bytes ${range.start}-${range.end}/${this.length}`
      res.headers['Content-Length'] = `${range.end - range.start + 1}`
    } else {
      res.headers['Content-Length'] = this.length
    }

    const stream = req.method === 'GET' && this.createReadStream(range)

    let pipe = null
    if (stream) {
      this.emit('stream', { stream, req, file: this }, piped => {
        pipe = piped

        // piped stream might not close the original filestream on close/error, this is agressive but necessary
        eos(piped, () => {
          if (piped) piped.destroy()
          stream.destroy()
        })
      })
    }

    return [res, pipe || stream, pipe && stream]
  }

  getStreamURL (cb = () => {}) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    if (!this._serviceWorker) throw new Error('No worker registered')
    if (this._serviceWorker.state !== 'activated') throw new Error('Worker isn\'t activated')
    const workerPath = this._serviceWorker.scriptURL.substr(0, this._serviceWorker.scriptURL.lastIndexOf('/') + 1).slice(window.location.origin.length)
    const url = `${workerPath}webtorrent/${this._torrent.infoHash}/${encodeURI(this.path)}`
    cb(null, url)
  }

  streamTo (elem, cb = () => {}) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    if (!this._serviceWorker) throw new Error('No worker registered')
    if (this._serviceWorker.state !== 'activated') throw new Error('Worker isn\'t activated')
    const workerPath = this._serviceWorker.scriptURL.substr(0, this._serviceWorker.scriptURL.lastIndexOf('/') + 1).slice(window.location.origin.length)
    elem.src = `${workerPath}webtorrent/${this._torrent.infoHash}/${encodeURI(this.path)}`
    cb(null, elem)
  }

  _getMimeType () {
    return render.mime[path.extname(this.name).toLowerCase()]
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

module.exports = File
