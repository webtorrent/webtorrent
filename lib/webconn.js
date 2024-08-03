import BitField from 'bitfield'
import debugFactory from 'debug'
import fetch from 'cross-fetch-ponyfill'
import ltDontHave from 'lt_donthave'
import { hash, concat } from 'uint8-util'
import Wire from 'bittorrent-protocol'
import once from 'once'

import VERSION from '../version.cjs'

const debug = debugFactory('webtorrent:webconn')

const SOCKET_TIMEOUT = 60000
const RETRY_DELAY = 10000

/**
 * Converts requests for torrent blocks into http range requests.
 * @param {string} url web seed url
 * @param {Object} torrent
 */
export default class WebConn extends Wire {
  constructor (url, torrent) {
    super()

    this.url = url
    this.connId = url // Unique id to deduplicate web seeds
    this._torrent = torrent

    this._init(url)
  }

  _init (url) {
    this.setKeepAlive(true)

    this.use(ltDontHave())

    this.once('handshake', async (infoHash, peerId) => {
      const hex = await hash(url, 'hex') // Used as the peerId for this fake remote peer
      if (this.destroyed) return
      this.handshake(infoHash, hex)

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
    this.lt_donthave.on('donthave', () => { debug('donthave') })

    this.on('request', (pieceIndex, offset, length, callback) => {
      debug('request pieceIndex=%d offset=%d length=%d', pieceIndex, offset, length)
      this.httpRequest(pieceIndex, offset, length, (err, data) => {
        if (err) {
          // Cancel all in progress requests for this piece
          this.lt_donthave.donthave(pieceIndex)

          // Wait a little while before saying the webseed has the failed piece again
          const retryTimeout = setTimeout(() => {
            if (this.destroyed) return

            this.have(pieceIndex)
          }, RETRY_DELAY)
          if (retryTimeout.unref) retryTimeout.unref()
        }

        callback(err, data)
      })
    })
  }

  async httpRequest (pieceIndex, offset, length, cb) {
    cb = once(cb)
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
      const requestedFiles = files.filter(file => file.offset <= rangeEnd && (file.offset + file.length) > rangeStart)
      if (requestedFiles.length < 1) {
        return cb(new Error('Could not find file corresponding to web seed range request'))
      }

      requests = requestedFiles.map(requestedFile => {
        const fileEnd = requestedFile.offset + requestedFile.length - 1
        const url = this.url +
          (this.url[this.url.length - 1] === '/' ? '' : '/') +
          requestedFile.path.replace(this._torrent.path, '')
        return {
          url,
          fileOffsetInRange: Math.max(requestedFile.offset - rangeStart, 0),
          start: Math.max(rangeStart - requestedFile.offset, 0),
          end: Math.min(fileEnd, rangeEnd - requestedFile.offset)
        }
      })
    }
    let chunks
    try {
      chunks = await Promise.all(requests.map(async ({ start, end, url }) => {
        debug(
          'Requesting url=%s pieceIndex=%d offset=%d length=%d start=%d end=%d',
          url, pieceIndex, offset, length, start, end
        )
        const res = await fetch(url, {
          cache: 'no-store',
          method: 'GET',
          headers: {
            'Cache-Control': 'no-store',
            'user-agent': `WebTorrent/${VERSION} (https://webtorrent.io)`,
            range: `bytes=${start}-${end}`
          },
          signal: AbortSignal.timeout(SOCKET_TIMEOUT)
        })
        if (!res.ok) throw new Error(`Unexpected HTTP status code ${res.status}`)
        const data = new Uint8Array(await res.arrayBuffer())

        debug('Got data of length %d', data.length)

        return data
      }))
    } catch (e) {
      return cb(e)
    }

    cb(null, concat(chunks))
  }

  destroy () {
    super.destroy()
    this._torrent = null
  }
}
