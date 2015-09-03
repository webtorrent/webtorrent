var auto = require('run-auto')
var DHT = require('bittorrent-dht/server')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var WebTorrent = require('../')

var bunnyTorrent = fs.readFileSync(__dirname + '/torrents/big-buck-bunny-private.torrent')
var bunnyParsed = parseTorrent(bunnyTorrent)

var leavesTorrent = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesParsed = parseTorrent(leavesTorrent)

// remove trackers from .torrent file
bunnyParsed.announce = []
leavesParsed.announce = []

test('private torrent should not use DHT', function (t) {
  t.plan(3)

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

    client: ['dhtPort', function (cb, r) {
      var client = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort }
      })
      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      var torrent = client.add(bunnyParsed)

      torrent.on('dhtAnnounce', function () {
        t.fail('client announced to dht')
      })

      client.on('torrent', function () {
        if (!torrent.discovery.dht && !torrent.swarm.handshakeOpts.dht) {
          t.pass('dht is disabled for this torrent')
          cb(null, client)
        }
      })
    }]

  }, function (err, r) {
    if (err) throw err

    dhtServer.destroy(function () {
      t.pass('dht server destroyed')
    })
    r.client.destroy(function () {
      t.pass('client destroyed')
    })
  })
})

test('public torrent should use DHT', function (t) {
  t.plan(3)

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

    client: ['dhtPort', function (cb, r) {
      var client = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort }
      })
      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      var torrent = client.add(leavesParsed)

      torrent.on('dhtAnnounce', function () {
        t.pass('client announced to dht')
        cb(null, client)
      })

      client.on('torrent', function () {
        if (!torrent.client.dht) {
          t.fail('dht server is null')
        }
      })
    }]

  }, function (err, r) {
    if (err) throw err

    dhtServer.destroy(function () {
      t.pass('dht server destroyed')
    })
    r.client.destroy(function () {
      t.pass('client destroyed')
    })
  })
})
