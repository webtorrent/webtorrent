const finalhandler = require('finalhandler')
const fixtures = require('webtorrent-fixtures')
const http = require('http')
const path = require('path')
const MemoryChunkStore = require('memory-chunk-store')
const series = require('run-series')
const serveStatic = require('serve-static')
const test = require('tape')
const WebTorrent = require('../../')

test('Download using webseed (via magnet uri)', t => {
  t.plan(9)

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
      client1 = new WebTorrent({ dht: false, tracker: false, lsd: false })

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
      client2 = new WebTorrent({ dht: false, tracker: false, lsd: false })

      client2.on('error', err => { t.fail(err) })
      client2.on('warning', err => { t.fail(err) })

      const webSeedUrl = `http://localhost:${httpServer.address().port}/${fixtures.leaves.parsedTorrent.name}`
      const magnetURI = `${fixtures.leaves.magnetURI}&ws=${encodeURIComponent(webSeedUrl)}`

      client2.on('torrent', torrent => {
        let gotBuffer = false
        let torrentDone = false

        torrent.files.forEach(file => {
          file.getBuffer((err, buf) => {
            t.error(err)
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
