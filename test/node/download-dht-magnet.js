var DHT = require('bittorrent-dht/server')
var fixtures = require('webtorrent-fixtures')
var fs = require('fs')
var MemoryChunkStore = require('memory-chunk-store')
var networkAddress = require('network-address')
var series = require('run-series')
var test = require('tape')
var WebTorrent = require('../../')
var common = require('./common')

common.wrapTest(test, 'Download using DHT (via magnet uri)', function (t, ipv6) {
  t.plan(12)

  var dhtServer = new DHT({ bootstrap: false, ipv6: ipv6 })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  var client1, client2

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      var dhtOpts = { bootstrap: (ipv6 ? '[::1]:' : '127.0.0.1:') + dhtServer.address().port, host: ipv6 ? networkAddress.ipv6() : networkAddress.ipv4() }

      client1 = new WebTorrent({
        tracker: false,
        dht: ipv6 ? false : dhtOpts,
        dht6: ipv6 ? dhtOpts : false
      })

      var dht = ipv6 ? client1.dht6 : client1.dht

      dht.on('listening', function () {
        t.equal(ipv6 ? client1.dhtPort6 : client1.dhtPort, dht.address().port)
      })

      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      var torrent = client1.add(fixtures.leaves.parsedTorrent, {store: MemoryChunkStore})

      torrent.on('dhtAnnounce', function () {
        t.pass('finished dht announce')
        announced = true
        maybeDone()
      })

      torrent.on('ready', function () {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [ 'Leaves of Grass by Walt Whitman.epub' ]
        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)
      })

      torrent.load(fs.createReadStream(fixtures.leaves.contentPath), function (err) {
        t.error(err)
        loaded = true
        maybeDone()
      })

      var announced = false
      var loaded = false
      function maybeDone () {
        if (announced && loaded) cb(null)
      }
    },

    function (cb) {
      var dhtOpts = { bootstrap: (ipv6 ? '[::1]:' : '127.0.0.1:') + dhtServer.address().port, host: ipv6 ? networkAddress.ipv6() : networkAddress.ipv4() }

      client2 = new WebTorrent({
        tracker: false,
        dht: ipv6 ? false : dhtOpts,
        dht6: ipv6 ? dhtOpts : false
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

      client2.add(fixtures.leaves.magnetURI, {store: MemoryChunkStore})

      var gotBuffer = false
      var gotDone = false
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
