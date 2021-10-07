const fs = require('fs')
const DHT = require('bittorrent-dht/server')
const fixtures = require('webtorrent-fixtures')
const MemoryChunkStore = require('memory-chunk-store')
const networkAddress = require('network-address')
const series = require('run-series')
const test = require('tape')
const WebTorrent = require('../../index.js')

test('Download using DHT (via magnet uri)', t => {
  t.plan(12)

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
        dht: { bootstrap: `127.0.0.1:${dhtServer.address().port}`, host: networkAddress.ipv4() }
      })

      client1.dht.on('listening', () => {
        t.equal(client1.dhtPort, client1.dht.address().port)
      })

      client1.on('error', err => { t.fail(err) })
      client1.on('warning', err => { t.fail(err) })

      const torrent = client1.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

      torrent.on('dhtAnnounce', () => {
        t.pass('finished dht announce')
        announced = true
        maybeDone()
      })

      torrent.on('ready', () => {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        const names = ['Leaves of Grass by Walt Whitman.epub']
        t.deepEqual(torrent.files.map(file => file.name), names)
      })

      torrent.load(fs.createReadStream(fixtures.leaves.contentPath), err => {
        t.error(err)
        loaded = true
        maybeDone()
      })

      function maybeDone () {
        if (announced && loaded) cb(null)
      }
    },

    cb => {
      let gotBuffer = false
      let gotDone = false

      client2 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: `127.0.0.1:${dhtServer.address().port}`, host: networkAddress.ipv4() }
      })

      client2.on('error', err => { t.fail(err) })
      client2.on('warning', err => { t.fail(err) })

      client2.on('torrent', torrent => {
        torrent.files[0].getBuffer((err, buf) => {
          t.error(err)
          t.deepEqual(buf, fixtures.leaves.content, 'downloaded correct content')

          gotBuffer = true
          maybeDone()
        })

        torrent.once('done', () => {
          t.pass('client2 downloaded torrent from client1')

          gotDone = true
          maybeDone()
        })
      })

      client2.add(fixtures.leaves.magnetURI, { store: MemoryChunkStore })

      function maybeDone () {
        if (gotBuffer && gotDone) cb(null)
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
