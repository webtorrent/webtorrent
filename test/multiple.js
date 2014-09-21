/*
var BitTorrentClient = require('../')
var test = require('tape')
var fs = require('fs')

var torrents = [ 'leaves', 'pride' ].map(function (name) {
  return fs.readFileSync(__dirname + '/torrents/' + name + '.torrent')
})

// TODO: replace this with a test that can run offline
test('two simultaneous downloads with dht disabled', function (t) {
  t.plan(torrents.length * 2)

  var client = new BitTorrentClient({ dht: false })
  var numDone = 0

  client.on('error', function (err) { t.fail(err.message) })

  torrents.forEach(function (torrent) {
    client.add(torrent)
  })

  client.on('torrent', function (torrent) {
    t.pass('received metadata for torrent ' + torrent.name)

    torrent.once('done', function () {
      t.pass('done downloading torrent ' + torrent.name)

      if (++numDone >= torrents.length) {
        client.destroy()
      }
    })
  })
})

test('two simultaneous downloads with dht enabled', function (t) {
  t.plan(torrents.length * 2)

  var client = new BitTorrentClient()
  var numDone = 0

  client.on('error', function (err) { t.fail(err.message) })

  torrents.forEach(function (torrent) {
    client.add(torrent)
  })

  client.on('torrent', function (torrent) {
    t.pass('received metadata for torrent ' + torrent.name)

    torrent.once('done', function () {
      t.pass('done downloading torrent ' + torrent.name)

      if (++numDone >= torrents.length) {
        client.destroy()
      }
    })
  })
})
*/
