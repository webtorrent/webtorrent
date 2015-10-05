var path = require('path')
var fs = require('fs')
var test = require('tape')
var WebTorrent = require('../')

var leavesBook = fs.readFileSync(path.resolve(__dirname, 'content', 'Leaves of Grass by Walt Whitman.epub'))

test('client.seed followed by duplicate client.add', function (t) {
  t.plan(3)

  var opts = {
    name: 'Leaves of Grass by Walt Whitman.epub'
  }

  var client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(leavesBook, opts, function (torrent1) {
    client.add(torrent1.infoHash, function (torrent2) {
      t.equal(torrent1.infoHash, torrent2.infoHash)
      t.equal(client.torrents.length, 1)
      client.destroy(function () {
        t.pass('destroyed client')
      })
    })
  })
})

test('client.seed followed by duplicate client.add, twice', function (t) {
  t.plan(5)

  var opts = {
    name: 'Leaves of Grass by Walt Whitman.epub'
  }

  var client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(leavesBook, opts, function (torrent1) {
    client.add(torrent1.infoHash, function (torrent2) {
      t.equal(torrent1.infoHash, torrent2.infoHash)
      t.equal(client.torrents.length, 1)
      client.add(torrent1.infoHash, function (torrent2) {
        t.equal(torrent1.infoHash, torrent2.infoHash)
        t.equal(client.torrents.length, 1)
        client.destroy(function () {
          t.pass('destroyed client')
        })
      })
    })
  })
})
