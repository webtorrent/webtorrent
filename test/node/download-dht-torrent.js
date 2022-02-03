const fs = require('fs')
const DHT = require('bittorrent-dht/server')
const fixtures = require('webtorrent-fixtures')
const MemoryChunkStore = require('memory-chunk-store')
const series = require('run-series')
const test = require('tape')
const WebTorrent = require('../../index.js')

test('Download using DHT (via .torrent file)', t => {
  t.plan(10)

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
      let noPeersFound = false

      client1 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: `127.0.0.1:${dhtServer.address().port}` },
        utPex: false
      })

      client1.dht.on('listening', () => {
        t.equal(client1.dhtPort, client1.dht.address().port)
      })

      client1.on('error', err => { t.fail(err) })
      client1.on('warning', err => { t.fail(err) })

      const torrent = client1.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

      torrent.on('ready', () => {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        const names = ['Leaves of Grass by Walt Whitman.epub']
        t.deepEqual(torrent.files.map(file => file.name), names)
      })

      torrent.load(fs.createReadStream(fixtures.leaves.contentPath), err => {
        loaded = true
        maybeDone(err)
      })

      torrent.on('dhtAnnounce', () => {
        announced = true
        maybeDone(null)
      })

      torrent.on('noPeers', announceType => {
        t.equal(announceType, 'dht', 'noPeers event seen with correct announceType')
        noPeersFound = true
        maybeDone(null)
      })

      function maybeDone (err) {
        if ((announced && loaded && noPeersFound) || err) cb(err, client1)
      }
    },

    cb => {
      client2 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: `127.0.0.1:${dhtServer.address().port}` },
        utPex: false
      })

      client2.on('error', err => { t.fail(err) })
      client2.on('warning', err => { t.fail(err) })

      client2.on('torrent', torrent => {
        let torrentDone = false
        let gotBuffer = false

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
          if (torrentDone && gotBuffer) cb(null)
        }
      })

      client2.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })
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
