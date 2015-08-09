var auto = require('run-auto')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var WebTorrent = require('../')

var http = require('http')
var serveStatic = require('serve-static')
var finalhandler = require('finalhandler')
var path = require('path')
var multipleFileTorrent = fs.readFileSync(__dirname + '/torrents/multiple.torrent')
var multipleFileTorrentParsed = parseTorrent(multipleFileTorrent)

// remove trackers from .torrent file
multipleFileTorrentParsed.announce = []

test('Download multiple files using webseed (via .torrent file)', function (t) {
  t.plan(18)

  var serve = serveStatic(path.join(__dirname, 'content'))
  var httpServer = http.createServer(function (req, res) {
    var done = finalhandler(req, res)
    serve(req, res, done)
  })

  httpServer.on('error', function (err) { t.fail(err) })

  auto({
    httpPort: function (cb) {
      httpServer.listen(cb)
    },
    client: ['httpPort', function (cb) {
      multipleFileTorrentParsed.urlList.push(
        'http://localhost:' + httpServer.address().port + '/'
      )

      var client = new WebTorrent({ tracker: false, dht: false })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      client.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.getBuffer(function (err, buf) {
            t.error(err)
            t.deepEqual(buf, fs.readFileSync(__dirname + '/content/' + file.path), 'downloaded correct content')
          })
        })

        torrent.once('done', function () {
          t.pass('client downloaded torrent from webseed')
          cb(null, client)
        })
      })

      client.add(multipleFileTorrentParsed)
    }]
  }, function (err, r) {
    t.error(err)
    r.client.destroy(function () {
      t.pass('client destroyed')
    })
    httpServer.close(function () {
      t.pass('http server closed')
    })
  })
})
