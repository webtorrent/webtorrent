import DHT from 'bittorrent-dht/server'
import fixtures from 'webtorrent-fixtures'
import fs from 'fs'
import MemoryChunkStore from 'memory-chunk-store'
import series from 'run-series'
import test from 'tape'
import WebTorrent from '../../index.js'

test('Download using DHT (via .torrent file)', function (t) {
  t.plan(10)

  const dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  let client1, client2

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      let announced = false
      let loaded = false
      let noPeersFound = false

      client1 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port }
      })

      client1.dht.on('listening', function () {
        t.equal(client1.dhtPort, client1.dht.address().port)
      })

      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      const torrent = client1.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

      torrent.on('ready', function () {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        const names = ['Leaves of Grass by Walt Whitman.epub']
        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)
      })

      torrent.load(fs.createReadStream(fixtures.leaves.contentPath), function (err) {
        loaded = true
        maybeDone(err)
      })

      torrent.on('dhtAnnounce', function () {
        announced = true
        maybeDone(null)
      })

      torrent.on('noPeers', function (announceType) {
        t.equal(announceType, 'dht', 'noPeers event seen with correct announceType')
        noPeersFound = true
        maybeDone(null)
      })

      function maybeDone (err) {
        if ((announced && loaded && noPeersFound) || err) cb(err, client1)
      }
    },

    function (cb) {
      client2 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port }
      })

      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      client2.on('torrent', function (torrent) {
        let torrentDone = false
        let gotBuffer = false

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
          if (torrentDone && gotBuffer) cb(null)
        }
      })

      client2.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })
    }
  ], function (err) {
    t.error(err)

    client1.destroy(function (err) {
      t.error(err, 'client1 destroyed')
    })
    client2.destroy(function (err) {
      t.error(err, 'client2 destroyed')
    })
    dhtServer.destroy(function (err) {
      t.error(err, 'dht server destroyed')
    })
  })
})
