var DHT = require('bittorrent-dht/server')
var fixtures = require('webtorrent-fixtures')
var fs = require('fs')
var MemoryChunkStore = require('memory-chunk-store')
var series = require('run-series')
var test = require('tape')
var WebTorrent = require('../../')
var common = require('./common')

common.wrapTest(test, 'Download using DHT (via .torrent file)', function (t, ipv6) {
  t.plan(10)

  var dhtServer = new DHT({ bootstrap: false, ipv6: ipv6 })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  var client1, client2

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      client1 = common.newClient(ipv6, dhtServer.address().port)

      var dht = ipv6 ? client1.dht6 : client1.dht
      dht.on('listening', function () {
        t.equal(ipv6 ? client1.dhtPort6 : client1.dhtPort, dht.address().port)
      })

      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      var torrent = client1.add(fixtures.leaves.parsedTorrent, {store: MemoryChunkStore})

      torrent.on('ready', function () {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [ 'Leaves of Grass by Walt Whitman.epub' ]
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

      var announced = false
      var loaded = false
      var noPeersFound = false
      function maybeDone (err) {
        if ((announced && loaded && noPeersFound) || err) cb(err, client1)
      }
    },

    function (cb) {
      var dhtOpts = { bootstrap: common.localHost(ipv6) + ':' + dhtServer.address().port }

      client2 = new WebTorrent({
        tracker: false,
        dht: ipv6 ? false : dhtOpts,
        dht6: ipv6 ? dhtOpts : false
      })

      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      client2.on('torrent', function (torrent) {
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

        var torrentDone = false
        var gotBuffer = false
        function maybeDone () {
          if (torrentDone && gotBuffer) cb(null)
        }
      })

      client2.add(fixtures.leaves.parsedTorrent, {store: MemoryChunkStore})
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
