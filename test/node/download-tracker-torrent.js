const fs = require('node:fs')
const fixtures = require('webtorrent-fixtures')
const MemoryChunkStore = require('memory-chunk-store')
const series = require('run-series')
const test = require('tape')
const TrackerServer = require('bittorrent-tracker/server')
const WebTorrent = require('../../index.js')

test('Download using UDP tracker (via .torrent file)', t => {
  torrentDownloadTest(t, 'udp')
})

test('Download using HTTP tracker (via .torrent file)', t => {
  torrentDownloadTest(t, 'http')
})

function torrentDownloadTest (t, serverType) {
  t.plan(9)

  let trackerStartCount = 0
  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)

  const tracker = new TrackerServer(
    serverType === 'udp' ? { http: false, ws: false } : { udp: false, ws: false }
  )

  tracker.on('error', err => { t.fail(err) })
  tracker.on('warning', err => { t.fail(err) })

  tracker.on('start', () => {
    trackerStartCount += 1
  })

  let client1, client2

  series([
    cb => {
      tracker.listen(cb)
    },

    cb => {
      client1 = new WebTorrent({ dht: false, lsd: false })
      client1.on('error', err => { t.fail(err) })
      client1.on('warning', err => { t.fail(err) })

      const port = tracker[serverType].address().port

      const announceUrl = serverType === 'http'
        ? `http://127.0.0.1:${port}/announce`
        : `udp://127.0.0.1:${port}`

      // Overwrite announce with our local tracker
      parsedTorrent.announce = [announceUrl]

      client1.on('torrent', torrent => {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        const names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(file => file.name), names)

        torrent.load(fs.createReadStream(fixtures.leaves.contentPath), cb)
      })

      client1.add(parsedTorrent, { store: MemoryChunkStore })
    },

    cb => {
      client2 = new WebTorrent({ dht: false, lsd: false })
      client2.on('error', err => { t.fail(err) })
      client2.on('warning', err => { t.fail(err) })

      client2.add(parsedTorrent, { store: MemoryChunkStore })

      client2.on('torrent', torrent => {
        let gotBuffer = false
        let torrentDone = false

        torrent.files.forEach(file => {
          file.getBuffer((err, buf) => {
            if (err) throw err
            t.deepEqual(buf, fixtures.leaves.content, 'downloaded correct content')
            gotBuffer = true
            maybeDone()
          })
        })

        torrent.once('done', () => {
          t.pass('client2 downloaded torrent from client1')
          torrentDone = true
          maybeDone()
        })

        function maybeDone () {
          if (gotBuffer && torrentDone) cb(null)
        }
      })
    }

  ], err => {
    t.error(err)
    t.equal(trackerStartCount, 2)

    tracker.close(() => {
      t.pass('tracker closed')
    })
    client1.destroy(err => {
      t.error(err, 'client1 destroyed')
    })
    client2.destroy(err => {
      t.error(err, 'client2 destroyed')
    })
  })
}
