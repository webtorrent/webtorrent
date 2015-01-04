var auto = require('run-auto')
var DHT = require('bittorrent-dht/server')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var WebTorrent = require('../')

var leavesTorrent = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesParsed = parseTorrent(leavesTorrent)

// remove trackers from .torrent file
leavesParsed.announce = []
leavesParsed.announceList = []

test('blocklist blocks peers discovered via DHT', function (t) {
  t.plan(6)

  var dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) {
    t.fail(err)
  })

  auto({
    dhtPort: function (cb) {
      dhtServer.listen(function (port) {
        cb(null, port)
      })
    },

    client1: ['dhtPort', function (cb, r) {
      var client1 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort }
      })
      client1.on('error', function (err) { t.fail(err) })

      var torrent1 = client1.add(leavesParsed)

      client1.on('torrent', function () {
        torrent1.on('dhtAnnounce', function () {
          t.pass('client1 announced to dht')
          cb(null, client1)
        })
      })

      torrent1.on('peer', function () {
        t.fail('client1 should not find any peers')
      })

      torrent1.on('blocked-peer', function () {
        t.fail('client1 should not block any peers')
      })
    }],

    client2: ['client1', function (cb, r) {
      var client2 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort },
        blocklist: [ '127.0.0.1' ]
      })
      client2.on('error', function (err) { t.fail(err) })

      var torrent2 = client2.add(leavesParsed)

      torrent2.on('blocked-peer', function () {
        t.pass('client2 blocked connection to client1')
      })

      torrent2.on('dhtAnnounce', function () {
        t.pass('client2 announced to dht')
        cb(null, client2)
      })

      torrent2.on('peer', function () {
        t.fail('client2 should not find any peers')
      })
    }]

  }, function (err, r) {
    if (err) throw err

    dhtServer.destroy(function () {
      t.pass('dht server destroyed')
    })
    r.client1.destroy(function () {
      t.pass('client1 destroyed')
    })
    r.client2.destroy(function () {
      t.pass('client2 destroyed')
    })
  })
})
