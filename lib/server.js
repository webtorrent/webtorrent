var debug = require('debug')('webtorrent:server')
var http = require('http')
var mime = require('mime')
var pump = require('pump')
var rangeParser = require('range-parser')
var url = require('url')

module.exports = function Server (torrent, opts) {
  var server = http.createServer()

  server.on('connection', function (socket) {
    socket.setTimeout(36000000)
  })

  server.on('request', function (req, res) {
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

    if (req.headers.origin)
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)

    var pathname = url.parse(req.url).pathname
    if (pathname === '/favicon.ico') return res.end()
    if (pathname === '/') {
      return res.end('TODO: list files')
    }

    var index = Number(pathname.slice(1))
    if (Number.isNaN(index) || index >= torrent.files.length) {
      res.statusCode = 404
      return res.end()
    }

    if (torrent.ready) onReady()
    else torrent.once('ready', onReady)

    function onReady () {
      var file = torrent.files[index]

      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Type', mime.lookup(file.name))
      res.statusCode = 206

      var range
      if (req.headers.range) {
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
      if (req.method === 'HEAD') res.end()
      pump(file.createReadStream(range), res)
    }
  })

  return server
}
