const DHT = require('bittorrent-dht/server')
const fixtures = require('webtorrent-fixtures')
const fs = require('fs')
const MemoryChunkStore = require('memory-chunk-store')
const networkAddress = require('network-address')
const series = require('run-series')
const test = require('tape')
const WebTorrent = require('../../')

test('Download using DHT (via magnet uri)', function (t) {
  t.plan(12)

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

      client1 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port, host: networkAddress.ipv4() }
      })

      client1.dht.on('listening', function () {
        t.equal(client1.dhtPort, client1.dht.address().port)
      })

      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      const torrent = client1.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

      torrent.on('dhtAnnounce', function () {
        t.pass('finished dht announce')
        announced = true
        maybeDone()
      })

      torrent.on('ready', function () {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        const names = ['Leaves of Grass by Walt Whitman.epub']
        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)
      })

      torrent.load(fs.createReadStream(fixtures.leaves.contentPath), function (err) {
        t.error(err)
        loaded = true
        maybeDone()
      })

      function maybeDone () {
        if (announced && loaded) cb(null)
      }
    },

    function (cb) {
      let gotBuffer = false
      let gotDone = false

      client2 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port, host: networkAddress.ipv4() }
      })

      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      client2.on('torrent', function (torrent) {
        torrent.files[0].getBuffer(function (err, buf) {
          t.error(err)
          t.deepEqual(buf, fixtures.leaves.content, 'downloaded correct content')

          gotBuffer = true
          maybeDone()
        })

        torrent.once('done', function () {
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
