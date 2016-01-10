var common = require('../common')
var DHT = require('bittorrent-dht/server')
var series = require('run-series')
var test = require('tape')
var WebTorrent = require('../../')

test('private torrent should not use DHT', function (t) {
  t.plan(4)

  var dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  var client

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      client = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port }
      })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      var torrent = client.add(common.bunny.parsedTorrent)

      torrent.on('dhtAnnounce', function () {
        t.fail('client announced to dht')
      })

      client.on('torrent', function () {
        if (!torrent.discovery.dht && !torrent.swarm.handshakeOpts.dht) {
          t.pass('dht is disabled for this torrent')
          cb(null)
        }
      })
    }
  ], function (err) {
    t.error(err)

    dhtServer.destroy(function (err) {
      t.error(err, 'dht server destroyed')
    })
    client.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
  })
})

test('public torrent should use DHT', function (t) {
  t.plan(4)

  var dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  var client

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      client = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port }
      })
      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      var torrent = client.add(common.leaves.parsedTorrent)

      torrent.on('dhtAnnounce', function () {
        t.pass('client announced to dht')
        cb(null)
      })

      client.on('torrent', function () {
        if (!torrent.client.dht) {
          t.fail('dht server is null')
        }
      })
    }
  ], function (err) {
    t.error(err)

    dhtServer.destroy(function (err) {
      t.error(err, 'dht server destroyed')
    })
    client.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
  })
})
