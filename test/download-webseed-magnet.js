var auto = require('run-auto')
var finalhandler = require('finalhandler')
var fs = require('fs')
var http = require('http')
var parseTorrent = require('parse-torrent')
var path = require('path')
var serveStatic = require('serve-static')
var test = require('tape')
var WebTorrent = require('../')

var leavesPath = path.resolve(__dirname, 'content', 'Leaves of Grass by Walt Whitman.epub')
var leavesFilename = 'Leaves of Grass by Walt Whitman.epub'
var leavesFile = fs.readFileSync(leavesPath)
var leavesTorrent = fs.readFileSync(path.resolve(__dirname, 'torrents', 'leaves.torrent'))
var leavesParsed = parseTorrent(leavesTorrent)

// remove trackers from .torrent file
leavesParsed.announce = []

test('Download using webseed (via magnet uri)', function (t) {
  t.plan(9)

  var serve = serveStatic(path.join(__dirname, 'content'))
  var httpServer = http.createServer(function (req, res) {
    var done = finalhandler(req, res)
    serve(req, res, done)
  })
  var magnetUri

  httpServer.on('error', function (err) { t.fail(err) })

  auto({
    httpPort: function (cb) {
      httpServer.listen(cb)
    },
    client1: ['httpPort', function (cb) {
      var client1 = new WebTorrent({ tracker: false, dht: false })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      var gotTorrent = false
      var gotListening = false
      function maybeDone () {
        if (gotTorrent && gotListening) cb(null, client1)
      }

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)

        // NOTE: client1 is *NOT* a seeder. Just has the metadata.
        gotTorrent = true
        maybeDone()
      })

      client1.on('listening', function () {
        gotListening = true
        maybeDone()
      })
    }],
    client2: ['client1', 'httpPort', function (cb, r) {
      var webSeedUrl = 'http://localhost:' + httpServer.address().port + '/' + leavesFilename
      magnetUri = 'magnet:?xt=urn:btih:' + leavesParsed.infoHash +
        '&ws=' + encodeURIComponent(webSeedUrl)

      var client2 = new WebTorrent({ tracker: false, dht: false })

      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      client2.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.getBuffer(function (err, buf) {
            t.error(err)
            t.deepEqual(buf, leavesFile, 'downloaded correct content')
            gotBuffer = true
            maybeDone()
          })
        })

        torrent.once('done', function () {
          t.pass('client2 downloaded torrent from client1')
          torrentDone = true
          maybeDone()
        })

        var gotBuffer = false
        var torrentDone = false
        function maybeDone () {
          if (gotBuffer && torrentDone) cb(null, client2)
        }
      })

      client2.add(magnetUri)

      client2.on('listening', function (port, torrent) {
        torrent.addPeer('127.0.0.1:' + r.client1.torrentPort)
      })
    }]
  }, function (err, r) {
    t.error(err)
    r.client1.destroy(function () {
      t.pass('client destroyed')
    })
    r.client2.destroy(function () {
      t.pass('client destroyed')
    })
    httpServer.close(function () {
      t.pass('http server closed')
    })
  })
})
