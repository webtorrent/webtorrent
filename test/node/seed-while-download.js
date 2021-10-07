const fs = require('fs')
const DHT = require('bittorrent-dht/server')
const fixtures = require('webtorrent-fixtures')
const MemoryChunkStore = require('memory-chunk-store')
const series = require('run-series')
const test = require('tape')
const WebTorrent = require('../../index.js')

test('Seed and download a file at the same time', t => {
  t.plan(14)

  const dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', err => { t.fail(err) })
  dhtServer.on('warning', err => { t.fail(err) })

  let client1, client2

  series([
    cb => {
      dhtServer.listen(cb)
    },

    cb => {
      let announced = false
      let loaded = false

      client1 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: `127.0.0.1:${dhtServer.address().port}` }
      })

      client1.on('error', err => { t.fail(err) })
      client1.on('warning', err => { t.fail(err) })

      const torrent = client1.add(fixtures.leaves.torrent, { store: MemoryChunkStore })

      torrent.on('dhtAnnounce', () => {
        t.pass('client1 finished dht announce')
        announced = true
        maybeDone()
      })

      torrent.load(fs.createReadStream(fixtures.leaves.contentPath), err => {
        t.error(err, 'client1 started seeding')
        loaded = true
        maybeDone()
      })

      function maybeDone () {
        if (announced && loaded) cb(null)
      }
    },

    cb => {
      let announced = false
      let loaded = false

      client2 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: `127.0.0.1:${dhtServer.address().port}` }
      })

      client2.on('error', err => { t.fail(err) })
      client2.on('warning', err => { t.fail(err) })

      const torrent = client2.add(fixtures.alice.torrent, { store: MemoryChunkStore })

      torrent.on('dhtAnnounce', () => {
        t.pass('client2 finished dht announce')
        announced = true
        maybeDone()
      })

      torrent.load(fs.createReadStream(fixtures.alice.contentPath), err => {
        t.error(err, 'client2 started seeding')
        loaded = true
        maybeDone()
      })

      function maybeDone () {
        if (announced && loaded) cb(null)
      }
    },

    cb => {
      let gotBuffer1 = false
      let gotBuffer2 = false
      let gotDone1 = false
      let gotDone2 = false

      client1.add(fixtures.alice.magnetURI, { store: MemoryChunkStore })

      client1.on('torrent', torrent => {
        torrent.files[0].getBuffer((err, buf) => {
          t.error(err)
          t.deepEqual(buf, fixtures.alice.content, 'client1 downloaded correct content')
          gotBuffer1 = true
          maybeDone()
        })

        torrent.once('done', () => {
          t.pass('client1 downloaded torrent from client2')
          gotDone1 = true
          maybeDone()
        })
      })

      client2.add(fixtures.leaves.magnetURI, { store: MemoryChunkStore })

      client2.on('torrent', torrent => {
        torrent.files[0].getBuffer((err, buf) => {
          t.error(err)
          t.deepEqual(buf, fixtures.leaves.content, 'client2 downloaded correct content')
          gotBuffer2 = true
          maybeDone()
        })

        torrent.once('done', () => {
          t.pass('client2 downloaded torrent from client1')
          gotDone2 = true
          maybeDone()
        })
      })

      function maybeDone () {
        if (gotBuffer1 && gotBuffer2 && gotDone1 && gotDone2) cb(null)
      }
    }

  ], err => {
    t.error(err)

    client1.destroy(err => {
      t.error(err, 'client1 destroyed')
    })
    client2.destroy(err => {
      t.error(err, 'client2 destroyed')
    })
    dhtServer.destroy(err => {
      t.error(err, 'dht server destroyed')
    })
  })
})
