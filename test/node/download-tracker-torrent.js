var extend = require('xtend')
var fixtures = require('webtorrent-fixtures')
var fs = require('fs')
var series = require('run-series')
var test = require('tape')
var TrackerServer = require('bittorrent-tracker/server')
var WebTorrent = require('../../')

test('Download using UDP tracker (via .torrent file)', function (t) {
  torrentDownloadTest(t, 'udp')
})

test('Download using HTTP tracker (via .torrent file)', function (t) {
  torrentDownloadTest(t, 'http')
})

function torrentDownloadTest (t, serverType) {
  t.plan(9)

  var trackerStartCount = 0
  var parsedTorrent = extend(fixtures.leaves.parsedTorrent)

  var tracker = new TrackerServer(
    serverType === 'udp' ? { http: false, ws: false } : { udp: false, ws: false }
  )

  tracker.on('error', function (err) { t.fail(err) })
  tracker.on('warning', function (err) { t.fail(err) })

  tracker.on('start', function () {
    trackerStartCount += 1
  })

  var client1, client2

  series([
    function (cb) {
      tracker.listen(cb)
    },

    function (cb) {
      client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      var port = tracker[serverType].address().port

      var announceUrl = serverType === 'http'
        ? 'http://127.0.0.1:' + port + '/announce'
        : 'udp://127.0.0.1:' + port

      // Overwrite announce with our local tracker
      parsedTorrent.announce = [ announceUrl ]

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)

        torrent.load(fs.createReadStream(fixtures.leaves.contentPath), cb)
      })

      client1.add(parsedTorrent)
    },

    function (cb) {
      client2 = new WebTorrent({ dht: false })
      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      client2.add(parsedTorrent)

      client2.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.getBuffer(function (err, buf) {
            if (err) throw err
            t.deepEqual(buf, fixtures.leaves.content, 'downloaded correct content')
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
    }

  ], function (err) {
    t.error(err)
    t.equal(trackerStartCount, 2)

    tracker.close(function () {
      t.pass('tracker closed')
    })
    client1.destroy(function (err) {
      t.error(err, 'client1 destroyed')
    })
    client2.destroy(function (err) {
      t.error(err, 'client2 destroyed')
    })
  })
}
