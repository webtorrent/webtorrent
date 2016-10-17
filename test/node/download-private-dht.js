var DHT = require('bittorrent-dht/server')
var fixtures = require('webtorrent-fixtures')
var MemoryChunkStore = require('memory-chunk-store')
var series = require('run-series')
var test = require('tape')
var common = require('./common')

common.wrapTest(test, 'private torrent should not use DHT', function (t, ipv6) {
  t.plan(4)

  var dhtServer = new DHT({ bootstrap: false, ipv6: ipv6 })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  var client

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      client = common.newClient(ipv6, dhtServer.address().port)

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      var torrent = client.add(fixtures.bunny.parsedTorrent, {store: MemoryChunkStore})

      torrent.on('dhtAnnounce', function () {
        t.fail('client announced to dht')
      })

      client.on('torrent', function () {
        if ((ipv6 && !torrent.discovery.dht6) || (!ipv6 && !torrent.discovery.dht)) {
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

common.wrapTest(test, 'public torrent should use DHT', function (t, ipv6) {
  t.plan(4)

  var dhtServer = new DHT({ bootstrap: false, ipv6: ipv6 })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  var client

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      client = common.newClient(ipv6, dhtServer.address().port)
      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      var torrent = client.add(fixtures.leaves.parsedTorrent, {store: MemoryChunkStore})

      torrent.on('dhtAnnounce', function () {
        t.pass('client announced to dht')
        cb(null)
      })

      client.on('torrent', function () {
        if (!(ipv6 ? torrent.client.dht6 : torrent.client.dht)) {
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
