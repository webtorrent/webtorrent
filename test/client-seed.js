/* global Blob */

var common = require('./common')
var test = require('tape')
var WebTorrent = require('../')

test('client.seed: torrent file (Buffer)', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(common.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub'
  }, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)

    client.remove(torrent, function (err) { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.seed: torrent file (Buffer), set name on buffer', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var buf = new Buffer(common.leaves.content)
  buf.name = 'Leaves of Grass by Walt Whitman.epub'

  client.seed(buf, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)

    client.remove(torrent, function (err) { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.seed: torrent file (Blob)', function (t) {
  if (typeof Blob === 'undefined') return t.end()

  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(new Blob([ common.leaves.content ]), {
    name: 'Leaves of Grass by Walt Whitman.epub'
  }, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)

    client.remove(torrent, function (err) { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})
