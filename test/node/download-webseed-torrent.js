import http from 'http'
import path from 'path'
import finalhandler from 'finalhandler'
import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import series from 'run-series'
import serveStatic from 'serve-static'
import test from 'tape'
import WebTorrent from '../../index.js'

// it should be fast to download a small torrent over local HTTP
const WEB_SEED_TIMEOUT_MS = 500

test('Download using webseed (via .torrent file)', t => {
  t.plan(5)
  t.timeoutAfter(WEB_SEED_TIMEOUT_MS)

  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)

  const httpServer = http.createServer((req, res) => {
    const done = finalhandler(req, res)
    serveStatic(path.dirname(fixtures.leaves.contentPath))(req, res, done)
  })
  let client

  httpServer.on('error', err => { t.fail(err) })

  series([
    cb => {
      httpServer.listen(cb)
    },

    cb => {
      parsedTorrent.urlList = [
        `http://localhost:${httpServer.address().port}/${fixtures.leaves.parsedTorrent.name}`
      ]

      client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

      client.on('error', err => { t.fail(err) })
      client.on('warning', err => { t.fail(err) })

      client.on('torrent', async torrent => {
        let gotBuffer = false
        let torrentDone = false
        function maybeDone () {
          if (gotBuffer && torrentDone) cb(null)
        }

        torrent.once('done', () => {
          t.pass('client downloaded torrent from webseed')
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

      client.add(parsedTorrent, { store: MemoryChunkStore })
    }
  ], err => {
    t.error(err)
    client.destroy(err => {
      t.error(err, 'client destroyed')
    })
    httpServer.close(() => {
      // FIXME: t.pass was moved outside of this function because node native fetch keeps
      // connections open for longer, this isn't an issue in the node-fetch package
      // this causes the http server take much longer to close, even tho all request
      // have already been settled
    })
    t.pass('http server closed')
  })
})

test('Disable webseeds', t => {
  t.plan(3)
  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)

  const httpServer = http.createServer((req, res) => {
    t.fail('webseed http server should not get any requests')
  })
  let client

  httpServer.on('error', err => { t.fail(err) })

  series([
    cb => {
      httpServer.listen(cb)
    },

    cb => {
      parsedTorrent.urlList = [
        `http://localhost:${httpServer.address().port}/${fixtures.leaves.parsedTorrent.name}`
      ]

      client = new WebTorrent({ dht: false, tracker: false, lsd: false, webSeeds: false })

      client.on('error', err => { t.fail(err) })
      client.on('warning', err => { t.fail(err) })

      client.add(parsedTorrent, { store: MemoryChunkStore })

      // The test above ensures that we can download the whole torrent over webseeds within a
      // short time. Here, we wait the same amount of time and make sure no HTTP requests happen.
      setTimeout(cb, WEB_SEED_TIMEOUT_MS)
    }
  ], err => {
    t.error(err)
    client.destroy(err => {
      t.error(err, 'client destroyed')
    })
    httpServer.close(() => {
      t.pass('http server closed')
    })
  })
})
