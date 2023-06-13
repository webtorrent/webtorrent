import http from 'http'
import path from 'path'
import finalhandler from 'finalhandler'
import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import series from 'run-series'
import serveStatic from 'serve-static'
import test from 'tape'
import WebTorrent from '../../index.js'

test('Download using webseed (via magnet uri)', t => {
  t.plan(8)

  const serve = serveStatic(path.dirname(fixtures.leaves.contentPath))
  const httpServer = http.createServer((req, res) => {
    const done = finalhandler(req, res)
    serve(req, res, done)
  })
  let client1, client2

  httpServer.on('error', err => { t.fail(err) })

  series([
    cb => {
      httpServer.listen(cb)
    },

    cb => {
      client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

      client1.on('error', err => { t.fail(err) })
      client1.on('warning', err => { t.fail(err) })

      let gotTorrent = false
      let gotListening = false
      function maybeDone () {
        if (gotTorrent && gotListening) cb(null)
      }

      client1.on('torrent', torrent => {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        const names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(file => file.name), names)

        // NOTE: client1 is *NOT* a seeder. Just has the metadata.
        gotTorrent = true
        maybeDone()
      })

      const torrent = client1.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

      torrent.on('infoHash', () => {
        gotListening = true
        maybeDone()
      })
    },

    cb => {
      client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

      client2.on('error', err => { t.fail(err) })
      client2.on('warning', err => { t.fail(err) })

      const webSeedUrl = `http://localhost:${httpServer.address().port}/${fixtures.leaves.parsedTorrent.name}`
      const magnetURI = `${fixtures.leaves.magnetURI}&ws=${encodeURIComponent(webSeedUrl)}`

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

      const torrent = client2.add(magnetURI, { store: MemoryChunkStore })

      torrent.on('infoHash', () => {
        torrent.addPeer(`127.0.0.1:${client1.address().port}`)
      })
    }
  ], err => {
    t.error(err)
    client1.destroy(err => {
      t.error(err, 'client destroyed')
    })
    client2.destroy(err => {
      t.error(err, 'client destroyed')
    })
    httpServer.close(() => {
      t.pass('http server closed')
    })
  })
})
