const fixtures = require('webtorrent-fixtures')
const fs = require('fs')
const MemoryChunkStore = require('memory-chunk-store')
const series = require('run-series')
const test = require('tape')
const TrackerServer = require('bittorrent-tracker/server')
const WebTorrent = require('../../')

test('Download using UDP tracker (via magnet uri)', function (t) {
  magnetDownloadTest(t, 'udp')
})

test('Download using HTTP tracker (via magnet uri)', function (t) {
  magnetDownloadTest(t, 'http')
})

function magnetDownloadTest (t, serverType) {
  t.plan(10)

  const tracker = new TrackerServer(
    serverType === 'udp' ? { http: false, ws: false } : { udp: false, ws: false }
  )

  tracker.on('error', function (err) { t.fail(err) })
  tracker.on('warning', function (err) { t.fail(err) })

  let trackerStartCount = 0
  tracker.on('start', function () {
    trackerStartCount += 1
  })

  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)
  let magnetURI, client1, client2

  series([
    function (cb) {
      tracker.listen(cb)
    },

    function (cb) {
      const port = tracker[serverType].address().port
      const announceUrl = serverType === 'http'
        ? 'http://127.0.0.1:' + port + '/announce'
        : 'udp://127.0.0.1:' + port

      parsedTorrent.announce = [announceUrl]
      magnetURI = 'magnet:?xt=urn:btih:' + parsedTorrent.infoHash + '&tr=' + encodeURIComponent(announceUrl)

      client1 = new WebTorrent({ dht: false, lsd: false })

      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        const names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        torrent.once('noPeers', function (announceType) {
          t.equal(announceType, 'tracker', 'noPeers event seen with correct announceType')
        })

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)

        torrent.load(fs.createReadStream(fixtures.leaves.contentPath), function (err) {
          cb(err)
        })
      })

      client1.add(parsedTorrent, { store: MemoryChunkStore })
    },

    function (cb) {
      client2 = new WebTorrent({ dht: false, lsd: false })

      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      client2.on('torrent', function (torrent) {
        let gotBuffer = false
        let torrentDone = false

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

        function maybeDone () {
          if (gotBuffer && torrentDone) cb(null)
        }
      })

      client2.add(magnetURI, { store: MemoryChunkStore })
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
