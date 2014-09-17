var debug = require('debug')('webtorrent:server')
var http = require('http')
var mime = require('mime')
var pump = require('pump')
var rangeParser = require('range-parser')
var url = require('url')

module.exports = function Server (webtorrent, port) {
  var server = http.createServer()

  server.on('connection', function (socket) {
    socket.setTimeout(36000000)
  })

  server.on('request', function (req, res) {
    debug('onRequest')

    if (req.headers.origin)
      res.setHeader('access-control-allow-origin', req.headers.origin)

    var u = url.parse(req.url)
    if (u.pathname === '/favicon.ico') return res.end()
    if (u.pathname === '/') u.pathname = '/' + webtorrent.index
    var i = Number(u.pathname.slice(1))

    if (isNaN(i) || i >= webtorrent.torrent.files.length) {
      res.statusCode = 404
      return res.end()
    }

    if (webtorrent.torrent) onTorrent(webtorrent.torrent)
    else webtorrent.once('torrent', onTorrent)

    function onTorrent (torrent) {
      var file = torrent.files[i]

      res.setHeader('accept-ranges', 'bytes')
      res.setHeader('content-type', mime.lookup(file.name))
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
  server.listen(port)

  return server
}
