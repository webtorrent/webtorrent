var common = require('../common')
var extend = require('xtend')
var finalhandler = require('finalhandler')
var http = require('http')
var path = require('path')
var series = require('run-series')
var serveStatic = require('serve-static')
var test = require('tape')
var WebTorrent = require('../../')

test('Download using webseed (via .torrent file)', function (t) {
  t.plan(6)

  var parsedTorrent = extend(common.leaves.parsedTorrent)

  var httpServer = http.createServer(function (req, res) {
    var done = finalhandler(req, res)
    serveStatic(path.join(__dirname, 'content'))(req, res, done)
  })
  var client

  httpServer.on('error', function (err) { t.fail(err) })

  series([
    function (cb) {
      httpServer.listen(cb)
    },

    function (cb) {
      parsedTorrent.urlList = [
        'http://localhost:' + httpServer.address().port + '/' + common.leaves.parsedTorrent.name
      ]

      client = new WebTorrent({ dht: false, tracker: false })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      client.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.getBuffer(function (err, buf) {
            t.error(err)
            t.deepEqual(buf, common.leaves.content, 'downloaded correct content')
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

      client.add(parsedTorrent)
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
