import fs from 'fs'
import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import series from 'run-series'
import test from 'tape'
import { Server as TrackerServer } from 'bittorrent-tracker'
import WebTorrent from '../../index.js'

test('Download using UDP tracker (via .torrent file)', t => {
  torrentDownloadTest(t, 'udp')
})

test('Download using HTTP tracker (via .torrent file)', t => {
  torrentDownloadTest(t, 'http')
})

test('Download using WS tracker (via .torrent file)', t => {
  torrentDownloadTest(t, 'ws')
})

const TRACKER_CONFIG_MAP = {
  udp: { http: false, ws: false },
  http: { udp: false, ws: false },
  ws: { udp: false, http: false, ws: true }
}

function torrentDownloadTest (t, serverType) {
  t.plan(9)

  let trackerStartCount = 0
  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)

  const tracker = new TrackerServer(TRACKER_CONFIG_MAP[serverType])

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

      const announceUrl = `${serverType}://127.0.0.1:${port}/announce`
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

      client2.on('torrent', async torrent => {
        let gotBuffer = false
        let torrentDone = false
        function maybeDone () {
          if (gotBuffer && torrentDone) cb(null)
        }

        torrent.once('done', () => {
          t.pass('client2 downloaded torrent from client1')
          torrentDone = true
          maybeDone()
        })

        for (const file of torrent.files) {
          try {
            const ab = await file.arrayBuffer()
            t.deepEqual(new Uint8Array(ab), new Uint8Array(fixtures.leaves.content), 'downloaded correct content')
          } catch (err) {
            t.error(err)
          }

          gotBuffer = true
          maybeDone()
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
