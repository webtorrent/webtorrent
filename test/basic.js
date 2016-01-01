/* global Blob */

var common = require('./common')
var extend = require('xtend')
var test = require('tape')
var WebTorrent = require('../')

test('client.add: magnet uri, utf-8 string', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.magnetURI)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)

    client.remove(common.leaves.magnetURI, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: torrent file, buffer', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.torrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)

    client.remove(common.leaves.torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: info hash, hex string', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, 'magnet:?xt=urn:btih:' + common.leaves.parsedTorrent.infoHash)

    client.remove(common.leaves.parsedTorrent.infoHash, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: info hash, buffer', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.parsedTorrent.infoHashBuffer)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.ok(torrent.magnetURI.indexOf('magnet:?xt=urn:btih:' + common.leaves.parsedTorrent.infoHash) === 0)

    client.remove(new Buffer(common.leaves.parsedTorrent.infoHash, 'hex'), function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: parsed torrent, from `parse-torrent`', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)

    client.remove(common.leaves.parsedTorrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: parsed torrent, with string type announce property', function (t) {
  t.plan(7)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var parsedTorrent = extend(common.leaves.parsedTorrent)
  parsedTorrent.announce = 'http://tracker.local:80'

  var torrent = client.add(parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)

    var expectedMagnetURI = common.leaves.magnetURI +
      '&tr=' + encodeURIComponent('http://tracker.local:80')
    t.equal(torrent.magnetURI, expectedMagnetURI)

    // `torrent.announce` must always be an array
    t.deepEqual(torrent.announce, [ 'http://tracker.local:80' ])

    client.remove(common.leaves.parsedTorrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: parsed torrent, with array type announce property', function (t) {
  t.plan(7)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var parsedTorrent = extend(common.leaves.parsedTorrent)
  parsedTorrent.announce = [ 'http://tracker.local:80', 'http://tracker.local:81' ]

  var torrent = client.add(parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)

    var expectedMagnetURI = common.leaves.magnetURI +
      '&tr=' + encodeURIComponent('http://tracker.local:80') +
      '&tr=' + encodeURIComponent('http://tracker.local:81')
    t.equal(torrent.magnetURI, expectedMagnetURI)

    t.deepEqual(torrent.announce, [ 'http://tracker.local:80', 'http://tracker.local:81' ])

    client.remove(common.leaves.parsedTorrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.remove: remove by Torrent object', function (t) {
  t.plan(5)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)

    client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('torrent.destroy: destroy and remove torrent', function (t) {
  t.plan(5)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)

    torrent.destroy(function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

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

  client.seed(common.leaves.content, function (torrent) {
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

test('after client.destroy(), throw on client.add() or client.seed()', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.destroy(function (err) { t.error(err, 'client destroyed') })

  t.throws(function () {
    client.add('magnet:?xt=urn:btih:' + common.leaves.parsedTorrent.infoHash)
  })
  t.throws(function () {
    client.seed(new Buffer('sup'))
  })
})

test('after client.destroy(), no "torrent" or "ready" events emitted', function (t) {
  t.plan(1)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.add(common.leaves.torrent, { name: 'leaves' }, function () {
    t.fail('unexpected "torrent" event (from add)')
  })
  client.seed(common.leaves.content, { name: 'leaves' }, function () {
    t.fail('unexpected "torrent" event (from seed)')
  })
  client.on('ready', function () {
    t.fail('unexpected "ready" event')
  })

  client.destroy(function (err) { t.error(err, 'client destroyed') })
})

test('client.add: invalid torrent id: empty string', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) {
    t.ok(err instanceof Error)
    t.ok(err.message.indexOf('Invalid torrent identifier') >= 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
  client.on('warning', function (err) { t.fail(err) })

  client.add('')
})

test('client.add: invalid torrent id: short buffer', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) {
    t.ok(err instanceof Error)
    t.ok(err.message.indexOf('Invalid torrent identifier') >= 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
  client.on('warning', function (err) { t.fail(err) })

  client.add(new Buffer('abc'))
})
