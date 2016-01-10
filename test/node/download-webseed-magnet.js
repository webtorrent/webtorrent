var common = require('../common')
var finalhandler = require('finalhandler')
var http = require('http')
var path = require('path')
var series = require('run-series')
var serveStatic = require('serve-static')
var test = require('tape')
var WebTorrent = require('../../')

test('Download using webseed (via magnet uri)', function (t) {
  t.plan(9)

  var serve = serveStatic(path.join(__dirname, 'content'))
  var httpServer = http.createServer(function (req, res) {
    var done = finalhandler(req, res)
    serve(req, res, done)
  })
  var client1, client2

  httpServer.on('error', function (err) { t.fail(err) })

  series([
    function (cb) {
      httpServer.listen(cb)
    },

    function (cb) {
      client1 = new WebTorrent({ dht: false, tracker: false })

      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      var gotTorrent = false
      var gotListening = false
      function maybeDone () {
        if (gotTorrent && gotListening) cb(null)
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

      client1.add(common.leaves.parsedTorrent)
    },

    function (cb) {
      client2 = new WebTorrent({ dht: false, tracker: false })

      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var webSeedUrl = 'http://localhost:' + httpServer.address().port + '/' + common.leaves.parsedTorrent.name
      var magnetURI = common.leaves.magnetURI + '&ws=' + encodeURIComponent(webSeedUrl)

      client2.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.getBuffer(function (err, buf) {
            t.error(err)
            t.deepEqual(buf, common.leaves.content, 'downloaded correct content')
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
          if (gotBuffer && torrentDone) cb(null)
        }
      })

      client2.on('listening', function (port, torrent) {
        torrent.addPeer('127.0.0.1:' + client1.address().port)
      })

      client2.add(magnetURI)
    }
  ], function (err) {
    t.error(err)
    client1.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
    client2.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
    httpServer.close(function () {
      t.pass('http server closed')
    })
  })
})
