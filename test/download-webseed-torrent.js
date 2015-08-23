var auto = require('run-auto')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var WebTorrent = require('../')

var http = require('http')
var serveStatic = require('serve-static')
var finalhandler = require('finalhandler')
var path = require('path')

var leavesPath = __dirname + '/content/Leaves of Grass by Walt Whitman.epub'
var leavesFilename = 'Leaves of Grass by Walt Whitman.epub'
var leavesFile = fs.readFileSync(leavesPath)
var leavesTorrent = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesParsed = parseTorrent(leavesTorrent)

// remove trackers from .torrent file
leavesParsed.announce = []

test('Download using webseed (via .torrent file)', function (t) {
  t.plan(6)

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
      leavesParsed.urlList.push(
        'http://localhost:' + httpServer.address().port + '/' + leavesFilename
      )

      var client = new WebTorrent({ tracker: false, dht: false })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      client.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.getBuffer(function (err, buf) {
            t.error(err)
            t.deepEqual(buf, leavesFile, 'downloaded correct content')
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
          if (gotBuffer && torrentDone) cb(null, client)
        }
      })

      client.add(leavesParsed)
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
