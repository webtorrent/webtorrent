var extend = require('xtend')
var fixtures = require('webtorrent-fixtures')
var series = require('run-series')
var test = require('tape')
var TrackerServer = require('bittorrent-tracker/server')
var WebTorrent = require('../../')

test('blocklist blocks peers discovered via tracker', function (t) {
  t.plan(9)

  var parsedTorrent = extend(fixtures.leaves.parsedTorrent)
  var tracker, client1, client2

  series([
    function (cb) {
      tracker = new TrackerServer({ udp: false, ws: false })

      tracker.listen(function () {
        var port = tracker.http.address().port
        var announceUrl = 'http://127.0.0.1:' + port + '/announce'

        // Overwrite announce with our local tracker
        parsedTorrent.announce = announceUrl

        cb(null)
      })

      tracker.once('start', function () {
        t.pass('client1 connected to tracker')

        tracker.once('start', function () {
          t.pass('client2 connected to tracker')
        })
      })
    },

    function (cb) {
      client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      var torrent1 = client1.add(parsedTorrent)

      torrent1.on('invalidPeer', function () {
        t.pass('client1 found itself')
        cb(null)
      })

      torrent1.on('blockedPeer', function () {
        t.fail('client1 should not block any peers')
      })
    },

    function (cb) {
      client2 = new WebTorrent({
        dht: false,
        blocklist: [ '127.0.0.1' ]
      })
      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var torrent2 = client2.add(parsedTorrent)

      torrent2.once('blockedPeer', function () {
        t.pass('client2 blocked first peer')

        torrent2.once('blockedPeer', function () {
          t.pass('client2 blocked second peer')
          cb(null)
        })
      })

      torrent2.on('peer', function () {
        t.fail('client2 should not find any peers')
      })
    }

  ], function (err) {
    t.error(err)
    tracker.close(function () {
      t.pass('tracker closed')
    })
    client1.destroy(function (err) {
      t.error(err, 'client1 destroyed')
    })
    client2.destroy(function (err) {
      t.error(err, 'client2 destroyed')
    })
  })
})
