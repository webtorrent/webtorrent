import debugFactory from 'debug'
import BitField from 'bitfield'
import fetch from 'cross-fetch-ponyfill'
import 'fast-readable-async-iterator'

import info from '../package.json' assert { type: 'json' }

const debug = debugFactory('webtorrent:webconn')
const VERSION = info.version

const SOCKET_TIMEOUT = 60000

function abortTimeout (ms = SOCKET_TIMEOUT) {
  const controller = new AbortController()
  setTimeout(() => {
    controller.abort()
  }, ms).unref?.()
  return controller
}

export default class AbstractWebSeed {
  /** @type {import('./torrent.js').default} */
  _torrent
  /** @type {BitField} */
  bitfield
  /** @type {AbortController[]} */
  abortControllers = []
  origin = ''
  backpressued = false

  constructor (url, torrent) {
    this._torrent = torrent
    this.origin = url

    this.bitfield = new BitField(this._torrent.pieces.length)
    this.bitfield.buffer.fill(255)
  }

  static spawn (url, torrent) {
    const seed = new AbstractWebSeed(url, torrent)
    return seed.init()
  }

  async init () {
    for (const file of this._torrent.files) {
      const { ok, backpressured } = await this.fetch({ file, method: 'HEAD' })
      this.backpressued = backpressured
      if (!ok) {
        for (let i = file._startPiece; i <= file._endPiece; ++i) {
          this.bitfield.set(i, false)
        }
      }
    }

    return this
  }

  urlTransform (url) {
    return url
  }

  requestTransform (opts) {
    return opts
  }

  /**
   * @param {object} opts
   * @param {import('./file.js').default} opts.file
   * @param {string=} opts.range
   * @param {("HEAD" | "GET")=} [opts.method="GET"]
   * @param {boolean=} [opts.critical=false]
   */
  async fetch ({ file, range = undefined, method = 'GET', critical = false }) {
    const url = this.origin +
      (this.origin[this.origin.length - 1] === '/' ? '' : '/') +
      file.path.replace(this._torrent.path, '')

    const controller = abortTimeout()

    const request = {
      cache: 'no-store',
      method,
      headers: {
        'Cache-Control': 'no-store',
        'user-agent': `WebTorrent/${VERSION} (https://webtorrent.io)`,
        range // `bytes=${start}-${end}`
      },
      signal: controller.signal,
      priority: critical ? 'high' : 'auto'
    }

    const transformedUrl = this.urlTransform(url)
    const opts = this.requestTransform(request)

    debug(
      'Requesting url=%s range=%s critical=%s method=%s',
      url, range ?? '', critical ? 'high' : 'auto', method
    )

    const response = await fetch(transformedUrl, opts)

    if (!response.ok) {
      debug('Failed getting data for range %d', response.status)
      controller.abort()
    } else {
      debug('Got data for range %s', range ?? 'full')
      this.abortControllers.push(controller)
    }

    const backpressured = response.headers.get('cache-control') === 'no-store'
    if (method === 'GET') {
      if (!response.ok) throw new Error(`Unexpected HTTP status code ${response.status}`)
      const iterator = response.body[Symbol.asyncIterator]
      return { iterator, backpressured }
    } else {
      return { ok: response.ok, backpressured }
    }
  }

  destroy () {
    for (const controller of this.abortControllers) {
      controller.abort()
    }
  }
}
