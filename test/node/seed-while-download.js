var common = require('../common')
var DHT = require('bittorrent-dht/server')
var fs = require('fs')
var series = require('run-series')
var test = require('tape')
var WebTorrent = require('../../')

test('Seed and download a file at the same time', function (t) {
  t.plan(14)

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

      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      var torrent = client1.add(common.leaves.torrent)

      torrent.on('dhtAnnounce', function () {
        t.pass('client1 finished dht announce')
        announced = true
        maybeDone()
      })

      torrent.load(fs.createReadStream(common.leaves.contentPath), function (err) {
        t.error(err, 'client1 started seeding')
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
      client2 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port },
        torrentPort: client1.torrentPort + 1
      })

      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var torrent = client2.add(common.alice.torrent)

      torrent.on('dhtAnnounce', function () {
        t.pass('client2 finished dht announce')
        announced = true
        maybeDone()
      })

      torrent.load(fs.createReadStream(common.alice.contentPath), function (err) {
        t.error(err, 'client2 started seeding')
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
      client1.add(common.alice.magnetURI)

      client1.on('torrent', function (torrent) {
        torrent.files[0].getBuffer(function (err, buf) {
          t.error(err)
          t.deepEqual(buf, common.alice.content, 'client1 downloaded correct content')
          gotBuffer1 = true
          maybeDone()
        })

        torrent.once('done', function () {
          t.pass('client1 downloaded torrent from client2')
          gotDone1 = true
          maybeDone()
        })
      })

      client2.add(common.leaves.magnetURI)

      client2.on('torrent', function (torrent) {
        torrent.files[0].getBuffer(function (err, buf) {
          t.error(err)
          t.deepEqual(buf, common.leaves.content, 'client2 downloaded correct content')
          gotBuffer2 = true
          maybeDone()
        })

        torrent.once('done', function () {
          t.pass('client2 downloaded torrent from client1')
          gotDone2 = true
          maybeDone()
        })
      })

      var gotBuffer1 = false
      var gotBuffer2 = false
      var gotDone1 = false
      var gotDone2 = false
      function maybeDone () {
        if (gotBuffer1 && gotBuffer2 && gotDone1 && gotDone2) cb(null)
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
