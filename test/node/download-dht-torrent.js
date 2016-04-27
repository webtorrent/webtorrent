var DHT = require('bittorrent-dht/server')
var fixtures = require('webtorrent-fixtures')
var fs = require('fs')
var series = require('run-series')
var test = require('tape')
var WebTorrent = require('../../')

test('Download using DHT (via .torrent file)', function (t) {
  t.plan(10)

  var dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  var client1, client2

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      client1 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port }
      })

      client1.dht.on('listening', function () {
        t.equal(client1.dhtPort, client1.dht.address().port)
      })

      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      var torrent = client1.add(fixtures.leaves.parsedTorrent)

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
      client2 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port }
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

      client2.add(fixtures.leaves.parsedTorrent)
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
