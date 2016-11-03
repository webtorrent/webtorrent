var extend = require('xtend')
var finalhandler = require('finalhandler')
var fixtures = require('webtorrent-fixtures')
var http = require('http')
var MemoryChunkStore = require('memory-chunk-store')
var path = require('path')
var series = require('run-series')
var serveStatic = require('serve-static')
var test = require('tape')
var WebTorrent = require('../../')

// it should be fast to download a small torrent over local HTTP
var WEB_SEED_TIMEOUT_MS = 500

test('Download using webseed (via .torrent file)', function (t) {
  t.plan(6)
  t.timeoutAfter(WEB_SEED_TIMEOUT_MS)

  var parsedTorrent = extend(fixtures.leaves.parsedTorrent)

  var httpServer = http.createServer(function (req, res) {
    var done = finalhandler(req, res)
    serveStatic(path.dirname(fixtures.leaves.contentPath))(req, res, done)
  })
  var client

  httpServer.on('error', function (err) { t.fail(err) })

  series([
    function (cb) {
      httpServer.listen(cb)
    },

    function (cb) {
      parsedTorrent.urlList = [
        'http://localhost:' + httpServer.address().port + '/' + fixtures.leaves.parsedTorrent.name
      ]

      client = new WebTorrent({ dht: false, tracker: false })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      client.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.getBuffer(function (err, buf) {
            t.error(err)
            t.deepEqual(buf, fixtures.leaves.content, 'downloaded correct content')
            gotBuffer = true
            maybeDone()
          })
        })

        torrent.once('done', function () {
          t.pass('client downloaded torrent from webseed')
          torrentDone = true
          maybeDone()
        })

        var gotBuffer = false
        var torrentDone = false
        function maybeDone () {
          if (gotBuffer && torrentDone) cb(null)
        }
      })

      client.add(parsedTorrent, {store: MemoryChunkStore})
    }
  ], function (err) {
    t.error(err)
    client.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
    httpServer.close(function () {
      t.pass('http server closed')
    })
  })
})

test('Disable webseeds', function (t) {
  var parsedTorrent = extend(fixtures.leaves.parsedTorrent)

  var httpServer = http.createServer(function (req, res) {
    t.fail('webseed http server should not get any requests')
  })
  var client

  httpServer.on('error', function (err) { t.fail(err) })

  series([
    function (cb) {
      httpServer.listen(cb)
    },

    function (cb) {
      parsedTorrent.urlList = [
        'http://localhost:' + httpServer.address().port + '/' + fixtures.leaves.parsedTorrent.name
      ]

      client = new WebTorrent({ dht: false, tracker: false, webSeeds: false })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      client.add(parsedTorrent, {store: MemoryChunkStore})

      // The test above ensures that we can download the whole torrent over webseeds within a
      // short time. Here, we wait the same amount of time and make sure no HTTP requests happen.
      setTimeout(cb, WEB_SEED_TIMEOUT_MS)
    }
  ], function (err) {
    t.error(err)
    client.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
    httpServer.close(function () {
      t.pass('http server closed')
      t.end()
    })
  })
})
