const BitField = require('bitfield')
const Buffer = require('safe-buffer').Buffer
const debug = require('debug')('webtorrent:webconn')
const get = require('simple-get')
const sha1 = require('simple-sha1')
const Wire = require('bittorrent-protocol')

const VERSION = require('../package.json').version

/**
 * Converts requests for torrent blocks into http range requests.
 * @param {string} url web seed url
 * @param {Object} torrent
 */
class WebConn extends Wire {
  constructor (url, torrent) {
    super()

    this.url = url
    this.webPeerId = sha1.sync(url)
    this._torrent = torrent

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
      debug('interested')
      this.unchoke()
    })

    this.on('uninterested', () => { debug('uninterested') })
    this.on('choke', () => { debug('choke') })
    this.on('unchoke', () => { debug('unchoke') })
    this.on('bitfield', () => { debug('bitfield') })

    this.on('request', (pieceIndex, offset, length, callback) => {
      debug('request pieceIndex=%d offset=%d length=%d', pieceIndex, offset, length)
      this.httpRequest(pieceIndex, offset, length, callback)
    })
  }

  httpRequest (pieceIndex, offset, length, cb) {
    const pieceOffset = pieceIndex * this._torrent.pieceLength
    const rangeStart = pieceOffset + offset /* offset within whole torrent */
    const rangeEnd = rangeStart + length - 1

    // Web seed URL format:
    // For single-file torrents, make HTTP range requests directly to the web seed URL
    // For multi-file torrents, add the torrent folder and file name to the URL
    const files = this._torrent.files
    let requests
    if (files.length <= 1) {
      requests = [{
        url: this.url,
        start: rangeStart,
        end: rangeEnd
      }]
    } else {
      const requestedFiles = files.filter(file => {
        return file.offset <= rangeEnd && (file.offset + file.length) > rangeStart
      })
      if (requestedFiles.length < 1) {
        return cb(new Error('Could not find file corresponnding to web seed range request'))
      }

      requests = requestedFiles.map(requestedFile => {
        const fileEnd = requestedFile.offset + requestedFile.length - 1
        const url = this.url +
          (this.url[this.url.length - 1] === '/' ? '' : '/') +
          requestedFile.path
        return {
          url,
          fileOffsetInRange: Math.max(requestedFile.offset - rangeStart, 0),
          start: Math.max(rangeStart - requestedFile.offset, 0),
          end: Math.min(fileEnd, rangeEnd - requestedFile.offset)
        }
      })
    }

    // Now make all the HTTP requests we need in order to load this piece
    // Usually that's one requests, but sometimes it will be multiple
    // Send requests in parallel and wait for them all to come back
    let numRequestsSucceeded = 0
    let hasError = false

    let ret
    if (requests.length > 1) {
      ret = Buffer.alloc(length)
    }

    requests.forEach(request => {
      const url = request.url
      const start = request.start
      const end = request.end
      debug(
        'Requesting url=%s pieceIndex=%d offset=%d length=%d start=%d end=%d',
        url, pieceIndex, offset, length, start, end
      )
      const opts = {
        url,
        method: 'GET',
        headers: {
          'user-agent': `WebTorrent/${VERSION} (https://webtorrent.io)`,
          range: `bytes=${start}-${end}`
        }
      }
      function onResponse (res, data) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          hasError = true
          return cb(new Error(`Unexpected HTTP status code ${res.statusCode}`))
        }
        debug('Got data of length %d', data.length)

        if (requests.length === 1) {
          // Common case: fetch piece in a single HTTP request, return directly
          cb(null, data)
        } else {
          // Rare case: reconstruct multiple HTTP requests across 2+ files into one
          // piece buffer
          data.copy(ret, request.fileOffsetInRange)
          if (++numRequestsSucceeded === requests.length) {
            cb(null, ret)
          }
        }
      }
      get.concat(opts, (err, res, data) => {
        if (hasError) return
        if (err) {
          // Browsers allow HTTP redirects for simple cross-origin
          // requests but not for requests that require preflight.
          // Use a simple request to unravel any redirects and get the
          // final URL.  Retry the original request with the new URL if
          // it's different.
          //
          // This test is imperfect but it's simple and good for common
          // cases.  It catches all cross-origin cases but matches a few
          // same-origin cases too.
          if (typeof window === 'undefined' || url.startsWith(`${window.location.origin}/`)) {
            hasError = true
            return cb(err)
          }

          return get.head(url, (errHead, res) => {
            if (hasError) return
            if (errHead) {
              hasError = true
              return cb(errHead)
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
              hasError = true
              return cb(new Error(`Unexpected HTTP status code ${res.statusCode}`))
            }
            if (res.url === url) {
              hasError = true
              return cb(err)
            }

            opts.url = res.url
            get.concat(opts, (err, res, data) => {
              if (hasError) return
              if (err) {
                hasError = true
                return cb(err)
              }
              onResponse(res, data)
            })
          })
        }
        onResponse(res, data)
      })
    })
  }

  destroy () {
    super.destroy()
    this._torrent = null
  }
}

module.exports = WebConn
