var fs = require('fs')
var path = require('path')
var fixtures = require('webtorrent-fixtures')
var test = require('tape')
var WebTorrent = require('../')

test('torrent.destroy: destroy torrent', function (t) {
  t.plan(5)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)

    torrent.destroy(function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('torrent.destroy: seed torrent and remove it', function (t) {
  t.plan(7)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    var completeFileName = path.join(torrent.path, torrent.files[0].name)

    client.remove(torrent, {'remove': true}, function (err) {
      t.error(err, 'torrent removed')
      // Check if stat is available
      if (fs.stat) {
        fs.stat(completeFileName, function (err) {
          if (err && err.code === 'ENOENT') return t.pass('File deleted')
          t.fail('File not deleted')
        })
      } else {
        t.pass('File deleted')
      }
      t.equal(client.torrents.length, 0)

      client.destroy(function (err) { t.error(err, 'client destroyed') })
    })
  })
})
