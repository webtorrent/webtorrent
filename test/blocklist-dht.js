var auto = require('run-auto')
var common = require('./common')
var DHT = require('bittorrent-dht/server')
var networkAddress = require('network-address')
var test = require('tape')
var WebTorrent = require('../')

test('blocklist blocks peers discovered via DHT', function (t) {
  t.plan(8)

  var dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  auto({
    dhtPort: function (cb) {
      dhtServer.listen(function () {
        var port = dhtServer.address().port
        cb(null, port)
      })
    },

    client1: ['dhtPort', function (cb, r) {
      var client1 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort }
      })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      var torrent1 = client1.add(common.leaves.parsedTorrent)

      torrent1.on('peer', function () {
        t.fail('client1 should not find any peers')
      })

      torrent1.on('blockedPeer', function () {
        t.fail('client1 should not block any peers')
      })

      torrent1.on('ready', function () {
        t.pass('torrent1 ready')
        torrentReady = true
        maybeDone()
      })

      torrent1.on('dhtAnnounce', function () {
        t.pass('client1 announced to dht')
        announced = true
        maybeDone()
      })

      var torrentReady = false
      var announced = false
      function maybeDone () {
        if (torrentReady && announced) cb(null, client1)
      }
    }],

    client2: ['client1', function (cb, r) {
      var client2 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort },
        blocklist: [ '127.0.0.1', networkAddress.ipv4() ]
      })
      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var torrent2 = client2.add(common.leaves.parsedTorrent)

      torrent2.on('blockedPeer', function () {
        t.pass('client2 blocked connection to client1')
      })

      torrent2.on('dhtAnnounce', function () {
        t.pass('client2 announced to dht')
        cb(null, client2)
      })

      torrent2.on('peer', function (addr) {
        t.fail('client2 should not find any peers')
      })
    }]

  }, function (err, r) {
    if (err) throw err

    dhtServer.destroy(function (err) {
      t.error(err, 'dht server destroyed')
    })
    r.client1.destroy(function (err) {
      t.error(err, 'client1 destroyed')
    })
    r.client2.destroy(function (err) {
      t.error(err, 'client2 destroyed')
    })
  })
})
