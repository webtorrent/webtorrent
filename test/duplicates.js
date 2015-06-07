var fs = require('fs')
var test = require('tape')
var WebTorrent = require('../')

var leavesBook = fs.readFileSync(__dirname + '/content/Leaves of Grass by Walt Whitman.epub')

test('client.seed followed by duplicate client.add', function (t) {
  t.plan(2)

  var opts = {
    name: 'Leaves of Grass by Walt Whitman.epub'
  }

  var client = new WebTorrent({ dht: false, tracker: false })
  client.seed(leavesBook, opts, function (torrent1) {
    client.add(torrent1.infoHash, function (torrent2) {
      t.equal(torrent1.infoHash, torrent2.infoHash)
      t.equal(client.torrents.length, 1)
    })
  })
})

test('client.seed followed by duplicate client.add, twice', function (t) {
  t.plan(4)

  var opts = {
    name: 'Leaves of Grass by Walt Whitman.epub'
  }

  var client = new WebTorrent({ dht: false, tracker: false })

  client.seed(leavesBook, opts, function (torrent1) {
    client.add(torrent1.infoHash, function (torrent2) {
      t.equal(torrent1.infoHash, torrent2.infoHash)
      t.equal(client.torrents.length, 1)
    })
  })

  client.seed(leavesBook, opts, function (torrent1) {
    client.add(torrent1.infoHash, function (torrent2) {
      t.equal(torrent1.infoHash, torrent2.infoHash)
      t.equal(client.torrents.length, 1)
    })
  })
})
