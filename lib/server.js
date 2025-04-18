import http from 'http'
import escapeHtml from 'escape-html'
import pump from 'pump'
import rangeParser from 'range-parser'
import queueMicrotask from 'queue-microtask'
import { Readable } from 'streamx'

const keepAliveTime = 20000

class ServerBase {
  constructor (client, opts = {}) {
    this.client = client
    if (!opts.origin) opts.origin = '*' // allow all origins by default
    this.opts = opts
    this.pendingReady = new Set()
  }

  static serveIndexPage (res, torrents, pathname) {
    const listHtml = torrents
      .map(torrent => (
      `<li>
        <a href="${escapeHtml(pathname)}/${torrent.infoHash}">
          ${escapeHtml(torrent.name)}
        </a>
        (${escapeHtml(torrent.length)} bytes)
      </li>`
      ))
      .join('<br>')

    res.status = 200
    res.headers['Content-Type'] = 'text/html'
    res.body = getPageHTML(
      'WebTorrent',
      `<h1>WebTorrent</h1>
       <ol>${listHtml}</ol>`
    )

    return res
  }

  isOriginAllowed (req) {
    // When `origin` option is `false`, deny all cross-origin requests
    if (this.opts.origin === false) return false

    // The user allowed all origins
    if (this.opts.origin === '*') return true

    // Allow requests where the 'Origin' header matches the `opts.origin` setting
    return req.headers.origin === this.opts.origin
  }

  static serveMethodNotAllowed (res) {
    res.status = 405
    res.headers['Content-Type'] = 'text/html'

    res.body = getPageHTML(
      '405 - Method Not Allowed',
      '<h1>405 - Method Not Allowed</h1>'
    )

    return res
  }

  static serve404Page (res) {
    res.status = 404
    res.headers['Content-Type'] = 'text/html'

    res.body = getPageHTML(
      '404 - Not Found',
      '<h1>404 - Not Found</h1>'
    )
    return res
  }

  static serveTorrentPage (torrent, res, pathname) {
    const listHtml = torrent.files
      .map(file => (
      `<li>
        <a href="${escapeHtml(pathname)}/${torrent.infoHash}/${escapeHtml(file.path)}">
          ${escapeHtml(file.path)}
        </a>
        (${escapeHtml(file.length)} bytes)
      </li>`
      ))
      .join('<br>')

    res.status = 200
    res.headers['Content-Type'] = 'text/html'

    res.body = getPageHTML(
      `${escapeHtml(torrent.name)} - WebTorrent`,
      `<h1>${escapeHtml(torrent.name)}</h1>
      <ol>${listHtml}</ol>`
    )

    return res
  }

  static serveOptionsRequest (req, res) {
    res.status = 204 // no content
    res.headers['Access-Control-Max-Age'] = '600'
    res.headers['Access-Control-Allow-Methods'] = 'GET,HEAD'

    if (req.headers['access-control-request-headers']) {
      res.headers['Access-Control-Allow-Headers'] = req.headers['access-control-request-headers']
    }
    return res
  }

  static serveFile (file, req, res) {
    res.status = 200

    // Disable caching as data is local anyways
    res.headers.Expires = '0'
    res.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    // Support range-requests
    res.headers['Accept-Ranges'] = 'bytes'
    res.headers['Content-Type'] = file.type
    // Support DLNA streaming
    res.headers['transferMode.dlna.org'] = 'Streaming'
    res.headers['contentFeatures.dlna.org'] = 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000'

    // Force the browser to download the file if if it's opened in a new tab
    // Set name of file (for "Save Page As..." dialog)
    if (req.destination === 'document') {
      res.headers['Content-Type'] = 'application/octet-stream'
      res.headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeRFC5987(file.name)}`
      res.body = 'DOWNLOAD'
    } else {
      res.headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeRFC5987(file.name)}`
    }

    // `rangeParser` returns an array of ranges, or an error code (number) if
    // there was an error parsing the range.
    let range = rangeParser(file.length, req.headers.range || '')

    if (Array.isArray(range)) {
      res.status = 206 // indicates that range-request was understood

      // no support for multi-range request, just use the first range
      range = range[0]

      res.headers['Content-Range'] = `bytes ${range.start}-${range.end}/${file.length}`

      res.headers['Content-Length'] = range.end - range.start + 1
    } else {
      res.statusCode = 200
      range = null
      res.headers['Content-Length'] = file.length
    }

    if (req.method === 'GET') {
      const iterator = file[Symbol.asyncIterator](range)
      let transform = null
      file.emit('iterator', { iterator, req, file }, target => {
        transform = target
      })

      const stream = Readable.from(transform || iterator)
      let pipe = null
      file.emit('stream', { stream, req, file }, target => {
        pipe = pump(stream, target)
      })

      res.body = pipe || stream
    } else {
      res.body = false
    }
    return res
  }

  async onRequest (req, cb) {
    let pathname = new URL(req.url, 'http://example.com').pathname
    pathname = pathname.slice(pathname.indexOf(this.pathname) + this.pathname.length + 1)

    const res = {
      headers: {
        // Prevent browser mime-type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Defense-in-depth: Set a strict Content Security Policy to mitigate XSS
        'Content-Security-Policy': "base-uri 'none'; frame-ancestors 'none'; form-action 'none';"
      }
    }

    // Allow cross-origin requests (CORS)
    if (this.isOriginAllowed(req)) {
      res.headers['Access-Control-Allow-Origin'] = this.opts.origin === '*' ? '*' : req.headers.origin
    }

    if (pathname === 'favicon.ico') {
      return cb(ServerBase.serve404Page(res))
    }

    // Allow CORS requests to specify arbitrary headers, e.g. 'Range',
    // by responding to the OPTIONS preflight request with the specified
    // origin and requested headers.
    if (req.method === 'OPTIONS') {
      if (this.isOriginAllowed(req)) return cb(ServerBase.serveOptionsRequest(req, res))
      else return cb(ServerBase.serveMethodNotAllowed(res))
    }

    const onReady = async () => {
      this.pendingReady.delete(onReady)
      const res = await handleRequest()
      cb(res)
    }

    const handleRequest = async () => {
      if (pathname === '') {
        return ServerBase.serveIndexPage(res, this.client.torrents, this.pathname)
      }

      let [infoHash, ...filePath] = pathname.split('/')
      filePath = decodeURI(filePath.join('/'))

      const torrent = await this.client.get(infoHash)
      if (!infoHash || !torrent) {
        return ServerBase.serve404Page(res)
      }

      if (!filePath) {
        return ServerBase.serveTorrentPage(torrent, res, this.pathname)
      }

      const file = torrent.files.find(file => file.path.replace(/\\/g, '/') === filePath)
      if (!file) {
        return ServerBase.serve404Page(res)
      }
      return ServerBase.serveFile(file, req, res)
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      if (this.client.ready) {
        const res = await handleRequest()
        return cb(res)
      } else {
        this.pendingReady.add(onReady)
        this.client.once('ready', onReady)
        return
      }
    }

    return cb(ServerBase.serveMethodNotAllowed(res))
  }

  close (cb = () => {}) {
    this.closed = true
    this.pendingReady.forEach(onReady => {
      this.client.removeListener('ready', onReady)
    })
    this.pendingReady.clear()
    queueMicrotask(cb)
  }

  destroy (cb = () => {}) {
    // Only call `server.close` if user has not called it already
    if (this.closed) queueMicrotask(cb)
    else this.close(cb)
    this.client = null
  }
}

class NodeServer extends ServerBase {
  constructor (client, opts) {
    super(client, opts)

    this.server = http.createServer()
    this._listen = this.server.listen
    this.server.listen = this.listen.bind(this)
    this._close = this.server.close
    this.server.close = this.close.bind(this)

    this.sockets = new Set()
    this.closed = false
    this.pathname = opts?.pathname || '/webtorrent'
  }

  wrapRequest (req, res) {
    // If a 'hostname' string is specified, deny requests with a 'Host'
    // header that does not match the origin of the torrent server to prevent
    // DNS rebinding attacks.
    if (this.opts.hostname && req.headers.host !== `${this.opts.hostname}:${this.server.address().port}`) {
      return req.destroy()
    }

    if (!new URL(req.url, 'http://example.com').pathname.startsWith(this.pathname)) {
      return req.destroy()
    }

    this.onRequest(req, ({ status, headers, body }) => {
      res.writeHead(status, headers)

      if (!!body?._readableState || !!body?._writableState) { // this is probably a bad way of checking? idk
        pump(body, res)
      } else {
        res.end(body)
      }
    })
  }

  onConnection (socket) {
    socket.setTimeout(36000000)
    this.sockets.add(socket)
    socket.once('close', () => {
      this.sockets.delete(socket)
    })
  }

  address () {
    return this.server.address()
  }

  listen (...args) {
    this.closed = false
    this.server.on('connection', this.onConnection.bind(this))
    this.server.on('request', this.wrapRequest.bind(this))
    return this._listen.apply(this.server, args)
  }

  close (cb = () => {}) {
    this.server.removeAllListeners('connection')
    this.server.removeAllListeners('request')
    this.server.removeAllListeners('listening')
    super.close()
    this._close.call(this.server, cb)
  }

  destroy (cb) {
    this.sockets.forEach(socket => {
      socket.destroy()
    })
    super.destroy(cb)
  }
}

class BrowserServer extends ServerBase {
  constructor (client, opts) {
    super(client, opts)

    this.registration = opts.controller
    this.workerKeepAliveInterval = null
    this.workerPortCount = 0

    const scope = new URL(opts.controller.scope)
    this.pathname = scope.pathname + 'webtorrent'
    this._address = {
      port: scope.port,
      family: 'IPv4', // might be a bad idea?
      address: scope.hostname
    }

    this.boundHandler = this.wrapRequest.bind(this)
    navigator.serviceWorker.addEventListener('message', this.boundHandler)
    // test if browser supports cancelling sw Readable Streams
    fetch(`${this.pathname}/cancel/`).then(res => {
      res.body.cancel()
    })
  }

  wrapRequest (event) {
    const req = event.data

    if (!req?.type === 'webtorrent' || !req.url) return null

    const [port] = event.ports
    this.onRequest(req, ({ status, headers, body }) => {
      const asyncIterator = body[Symbol.asyncIterator]?.()

      const cleanup = () => {
        port.onmessage = null
        if (body?.destroy) body.destroy()
        this.workerPortCount--
        if (!this.workerPortCount) {
          clearInterval(this.workerKeepAliveInterval)
          this.workerKeepAliveInterval = null
        }
      }

      port.onmessage = async msg => {
        if (msg.data) {
          let chunk
          try {
            chunk = (await asyncIterator.next()).value
          } catch (e) {
            // chunk is yet to be downloaded or it somehow failed, should this be logged?
          }
          port.postMessage(chunk)
          if (!chunk) cleanup()
          if (!this.workerKeepAliveInterval) {
            this.workerKeepAliveInterval = setInterval(() => fetch(`${this.pathname}/keepalive/`), keepAliveTime)
          }
        } else {
          cleanup()
        }
      }
      this.workerPortCount++
      port.postMessage({
        status,
        headers,
        body: asyncIterator ? 'STREAM' : body
      })
    })
  }

  // for compatibility with node version
  listen (_, cb) {
    cb()
  }

  address () {
    return this._address
  }

  close (cb) {
    navigator.serviceWorker.removeEventListener('message', this.boundHandler)
    super.close(cb)
  }

  destroy (cb) {
    super.destroy(cb)
  }
}

// NOTE: Arguments must already be HTML-escaped
function getPageHTML (title, pageHtml) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
      </head>
      <body>
        ${pageHtml}
      </body>
    </html>
  `
}

// From https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
function encodeRFC5987 (str) {
  return encodeURIComponent(str)
    // Note that although RFC3986 reserves "!", RFC5987 does not,
    // so we do not need to escape it
    .replace(/['()]/g, escape) // i.e., %27 %28 %29
    .replace(/\*/g, '%2A')
    // The following are not required for percent-encoding per RFC5987,
    // so we can allow for a little better readability over the wire: |`^
    .replace(/%(?:7C|60|5E)/g, unescape)
}

export { NodeServer, BrowserServer }
