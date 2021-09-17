/* global AbortController */
const BitField = require('bitfield').default
const sha1 = require('simple-sha1')
const Wire = require('bittorrent-protocol')
const fetch = require('node-fetch')

const VERSION = require('../package.json').version

function concat (chunks, size) {
  if (!size) {
    size = 0
    let i = chunks.length || chunks.byteLength || 0
    while (i--) size += chunks[i].length
  }
  const b = new Uint8Array(size)
  let offset = 0
  for (let i = 0, l = chunks.length; i < l; i++) {
    const chunk = chunks[i]
    b.set(chunk, offset)
    offset += chunk.byteLength || chunk.length
  }

  return b
}

class Queue {
  constructor () {
    this.queue = []
    this.destroyed = false
  }

  add (fn) {
    this.queue.push(fn)
    if (!this.destroyed && this.queue.length === 1) this._next()
  }

  async _next () {
    const fn = this.queue[0]
    await fn()
    this._remove()
    if (!this.destroyed && this.queue.length) this._next()
  }

  _remove () {
    if (!this.destroyed) this.queue.shift()
  }

  destroy () {
    this.destroyed = true
    this.queue = null
  }
}

/**
 * Converts requests for torrent blocks into http range requests.
 * @param {string} url web seed url
 * @param {Object} torrent
 */
class WebConn extends Wire {
  constructor (url, torrent) {
    super()

    this.url = url
    this.connId = url
    this.webPeerId = sha1.sync(url)
    this._torrent = torrent
    this.lastRequest = {}

    this.sleep = null

    this.queue = new Queue()

    this._init()
  }

  _init () {
    this.setKeepAlive(true)

    this.once('handshake', (infoHash, peerId) => {
      if (this.destroyed) return
      this.handshake(infoHash, this.webPeerId)
      const numPieces = this._torrent.pieces.length
      const bitfield = new BitField(numPieces)
      for (let i = 0; i <= numPieces; i++) {
        bitfield.set(i, true)
      }
      this.bitfield(bitfield)
    })

    this.once('interested', () => {
      this.unchoke()
    })

    this.on('request', (pieceIndex, offset, length, callback) => {
      const request = () => this.queue.add(async () => await this.httpRequest(pieceIndex, offset, length, (err, data) => {
        if (err || data?.length !== length) return request()
        callback(err, data)
      }))
      request()
    })
  }

  async httpRequest (pieceIndex, offset, length, cb) {
    const pieceOffset = pieceIndex * this._torrent.pieceLength
    const rangeStart = pieceOffset + offset
    const rangeEnd = rangeStart + length - 1
    const files = this._torrent.files
    let requests
    if (files.length <= 1) {
      requests = [{
        url: this.url,
        start: rangeStart,
        end: rangeEnd
      }]
    } else {
      const requestedFiles = files.filter(file => file.offset <= rangeEnd && (file.offset + file.length) > rangeStart)
      if (requestedFiles.length < 1) {
        return cb(new Error('Could not find file corresponding to web seed range request'))
      }

      requests = requestedFiles.map(file => {
        const fileEnd = file.offset + file.length - 1
        const url = this.url +
        (this.url[this.url.length - 1] === '/' ? '' : '/') +
        file.path
        return {
          url,
          fileOffsetInRange: Math.max(file.offset - rangeStart, 0),
          start: Math.max(rangeStart - file.offset, 0),
          end: Math.min(fileEnd, rangeEnd - file.offset)
        }
      })
    }
    let numRequestsSucceeded = 0
    let hasError = false

    let ret
    if (requests.length > 1) {
      ret = Buffer.alloc(length)
    }

    let { res, reader, endRange, setSize, ctrl } = this.lastRequest
    for await (const request of requests) { // controversial, but only make 1 request at a time
      const { url, start, end } = request
      function onResponse (res, data) {
        if (!res || res.status < 200 || res.status >= 300) {
          if (hasError) return
          hasError = true
          return cb(new Error(`Unexpected HTTP status code ${res?.status}`))
        }
        if (requests.length === 1) {
          cb(null, data)
        } else {
          data.copy(ret, request.fileOffsetInRange)
          if (++numRequestsSucceeded === requests.length) {
            cb(null, ret)
          }
        }
      }
      if (endRange !== start - 1 || ctrl?.signal?.aborted) {
        async function * read (reader) { // <3 Endless
          let buffered = []
          let bufferedBytes = 0
          let done = false
          let size = 512
          const setSize = x => { size = x }
          yield setSize

          while (!done) {
            const it = await reader.read()
            done = it.done
            if (done) {
              yield concat(buffered, bufferedBytes)
              return
            } else {
              bufferedBytes += it.value.byteLength
              buffered.push(it.value)

              while (bufferedBytes >= size) {
                const b = concat(buffered)
                bufferedBytes -= size
                yield b.slice(0, size)
                buffered = [b.slice(size, b.length)]
              }
            }
          }
        }
        if (ctrl) ctrl.abort()
        ctrl = new AbortController()
        await this.sleep
        try {
          res = await fetch(url, {
            headers: {
              range: `bytes=${start}-`,
              'user-agent': `WebTorrent/${VERSION} (https://webtorrent.io)`
            },
            signal: ctrl.signal
          })
        } catch (e) {
          onResponse()
          throw e
        }
        reader = read(res.body.getReader(), 1)
        setSize = (await reader.next()).value // lazy, but 1st yield is callback x)
      }
      endRange = end
      setSize(end - start + 1)
      onResponse(res, (await reader.next()).value || new Uint8Array())
    }
    this.lastRequest = { res, reader, endRange, setSize, ctrl }
  }

  destroy () {
    this.lastRequest?.ctrl?.abort()
    this.queue.destroy()
    super.destroy()
    this._torrent = null
  }
}

module.exports = WebConn
