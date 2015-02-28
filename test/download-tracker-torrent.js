var auto = require('run-auto')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var TrackerServer = require('bittorrent-tracker/server')
var WebTorrent = require('../')

var leavesPath = __dirname + '/content/Leaves of Grass by Walt Whitman.epub'
var leavesFile = fs.readFileSync(leavesPath)
var leavesTorrent = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesParsed = parseTorrent(leavesTorrent)

test('Download using UDP tracker (via .torrent file)', function (t) {
  torrentDownloadTest(t, 'udp')
})

test('Download using HTTP tracker (via .torrent file)', function (t) {
  torrentDownloadTest(t, 'http')
})

function torrentDownloadTest (t, serverType) {
  t.plan(9)

  var trackerStartCount = 0

  auto({
    tracker: function (cb) {
      var tracker = new TrackerServer(
        serverType === 'udp' ? { http: false } : { udp: false }
      )

      tracker.on('error', function (err) {
        t.fail(err)
      })

      tracker.on('start', function () {
        trackerStartCount += 1
      })

      tracker.listen(function () {
        var port = tracker[serverType].address().port
        var announceUrl = serverType === 'http'
          ? 'http://127.0.0.1:' + port + '/announce'
          : 'udp://127.0.0.1:' + port

        // Overwrite announce with our local tracker
        leavesParsed.announce = [ announceUrl ]
        leavesParsed.announceList = [[ announceUrl ]]

        cb(null, tracker)
      })
    },

    client1: ['tracker', function (cb) {
      var client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)

        torrent.storage.load(fs.createReadStream(leavesPath), function (err) {
          cb(err, client1)
        })
      })
    }],

    client2: ['client1', function (cb) {
      var client2 = new WebTorrent({ dht: false })
      client2.on('error', function (err) { t.fail(err) })

      client2.add(leavesParsed)

      client2.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.getBuffer(function (err, buf) {
            if (err) throw err
            t.deepEqual(buf, leavesFile, 'downloaded correct content')
          })
        })

        torrent.once('done', function () {
          t.pass('client2 downloaded torrent from client1')
          cb(null, client2)
        })
      })
    }]

  }, function (err, r) {
    t.error(err)
    t.equal(trackerStartCount, 2)

    r.tracker.close(function () {
      t.pass('tracker closed')
    })
    r.client1.destroy(function () {
      t.pass('client1 destroyed')
    })
    r.client2.destroy(function () {
      t.pass('client2 destroyed')
    })
  })
}
