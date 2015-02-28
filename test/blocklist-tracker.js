var auto = require('run-auto')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var TrackerServer = require('bittorrent-tracker/server')
var WebTorrent = require('../')

var leavesTorrent = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesParsed = parseTorrent(leavesTorrent)

test('blocklist blocks peers discovered via tracker', function (t) {
  t.plan(8)

  auto({
    tracker: function (cb) {
      var tracker = new TrackerServer({ udp: false })

      tracker.listen(function () {
        var port = tracker.http.address().port
        var announceUrl = 'http://127.0.0.1:' + port + '/announce'

        // Overwrite announce with our local tracker
        leavesParsed.announce = [ announceUrl ]
        leavesParsed.announceList = [[ announceUrl ]]

        cb(null, tracker)
      })

      tracker.on('start', function () {
        t.pass('client connected to tracker') // 2x, once for each client
      })
    },

    client1: ['tracker', function (cb) {
      var client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })

      var torrent1 = client1.add(leavesParsed)

      torrent1.on('peer', function () {
        t.pass('client1 found itself')
        cb(null, client1)
      })

      torrent1.on('blocked-peer', function () {
        t.fail('client1 should not block any peers')
      })
    }],

    client2: ['client1', function (cb) {
      var client2 = new WebTorrent({
        dht: false,
        blocklist: [ '127.0.0.1' ]
      })
      client2.on('error', function (err) { t.fail(err) })

      var torrent2 = client2.add(leavesParsed)

      torrent2.on('blocked-peer', function () {
        t.pass('client2 blocked connection') // 2x, once for each client
        cb(null, client2)
      })

      torrent2.on('peer', function () {
        t.fail('client2 should not find any peers')
      })
    }]

  }, function (err, r) {
    if (err) throw err

    r.tracker.close(function () {
      t.pass('tracker closed')
    })
    r.client1.destroy(function () {
      t.pass('client1 destroyed')
    })
    r.client2.destroy(function () {
      t.pass('client2 destroyed')
    })
  })
})
