module.exports = Server

var arrayRemove = require('unordered-array-remove')
var debug = require('debug')('webtorrent:server')
var http = require('http')
var mime = require('mime')
var pump = require('pump')
var rangeParser = require('range-parser')
var url = require('url')

function Server (torrent, opts) {
  var server = http.createServer(opts)

  var sockets = []
  var pendingReady = []
  var closed = false

  server.on('connection', onConnection)
  server.on('request', onRequest)

  var _close = server.close
  server.close = function (cb) {
    closed = true
    torrent = null
    server.removeListener('connection', onConnection)
    server.removeListener('request', onRequest)
    while (pendingReady.length) {
      var onReady = pendingReady.pop()
      torrent.removeListener('ready', onReady)
    }
    _close.call(server, cb)
  }

  server.destroy = function (cb) {
    sockets.forEach(function (socket) {
      socket.destroy()
    })

    // Only call `server.close` if user has not called it already
    if (closed) process.nextTick(cb)
    else server.close(cb)
  }

  function onConnection (socket) {
    socket.setTimeout(36000000)
    sockets.push(socket)
    socket.once('close', function () {
      arrayRemove(sockets, sockets.indexOf(socket))
    })
  }

  function onRequest (req, res) {
    debug('onRequest')

    // Allow CORS requests to specify arbitrary headers, e.g. 'Range',
    // by responding to the OPTIONS preflight request with the specified
    // origin and requested headers.
    if (req.method === 'OPTIONS' && req.headers['access-control-request-headers']) {
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      res.setHeader(
        'Access-Control-Allow-Headers',
        req.headers['access-control-request-headers']
      )
      res.setHeader('Access-Control-Max-Age', '1728000')
      return res.end()
    }

    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    }

    var pathname = url.parse(req.url).pathname
    if (pathname === '/favicon.ico') return res.end()

    if (torrent.ready) {
      onReady()
    } else {
      pendingReady.push(onReady)
      torrent.once('ready', onReady)
    }

    function onReady () {
      arrayRemove(pendingReady, pendingReady.indexOf(onReady))
      if (pathname === '/') {
        res.setHeader('Content-Type', 'text/html')
        var listHtml = torrent.files.map(function (file, i) {
          return '<li><a download="' + file.name + '" href="/' + i + '">' + file.path + '</a> ' +
            '(' + file.length + ' bytes)</li>'
        }).join('<br>')

        var html = '<h1>' + torrent.name + '</h1><ol>' + listHtml + '</ol>'
        return res.end(html)
      }

      var index = Number(pathname.slice(1))
      if (Number.isNaN(index) || index >= torrent.files.length) {
        res.statusCode = 404
        return res.end('404 Not Found')
      }

      var file = torrent.files[index]

      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Type', mime.lookup(file.name))
      res.statusCode = 200

      // Support DLNA streaming
      res.setHeader('transferMode.dlna.org', 'Streaming')
      res.setHeader(
        'contentFeatures.dlna.org',
        'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000'
      )

      var range
      if (req.headers.range) {
        res.statusCode = 206
        // no support for multi-range reqs
        range = rangeParser(file.length, req.headers.range)[0]
        debug('range %s', JSON.stringify(range))
        res.setHeader(
          'Content-Range',
          'bytes ' + range.start + '-' + range.end + '/' + file.length
        )
        res.setHeader('Content-Length', range.end - range.start + 1)
      } else {
        res.setHeader('Content-Length', file.length)
      }

      if (req.method === 'HEAD') {
        return res.end()
      }

      pump(file.createReadStream(range), res)
    }
  }

  return server
}
