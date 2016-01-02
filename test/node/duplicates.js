var common = require('../common')
var test = require('tape')
var WebTorrent = require('../../')

test('client.seed followed by duplicate client.add', function (t) {
  t.plan(5)

  var client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(common.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub'
  }, function (torrent1) {
    t.equal(client.torrents.length, 1)

    client.add(torrent1.infoHash, function (torrent2) {
      t.equal(torrent1.infoHash, torrent2.infoHash)
      t.equal(client.torrents.length, 1)

      client.destroy(function (err) {
        t.error(err, 'destroyed client')
        t.equal(client.torrents.length, 0)
      })
    })
  })
})

test('client.seed followed by two duplicate client.add calls', function (t) {
  t.plan(7)

  var client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(common.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub'
  }, function (torrent1) {
    t.equal(client.torrents.length, 1)

    client.add(torrent1.infoHash, function (torrent2) {
      t.equal(torrent1.infoHash, torrent2.infoHash)
      t.equal(client.torrents.length, 1)

      client.add(torrent1.infoHash, function (torrent2) {
        t.equal(torrent1.infoHash, torrent2.infoHash)
        t.equal(client.torrents.length, 1)

        client.destroy(function (err) {
          t.error(err, 'destroyed client')
          t.equal(client.torrents.length, 0)
        })
      })
    })
  })
})
