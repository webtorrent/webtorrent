var common = require('./common')
var extend = require('xtend')
var test = require('tape')
var WebTorrent = require('../')

test('client.add/remove: magnet uri, utf-8 string', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add('magnet:?xt=urn:btih:' + common.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.ok(torrent.magnetURI.indexOf('magnet:?xt=urn:btih:' + common.leaves.parsedTorrent.infoHash) === 0)
    client.remove('magnet:?xt=urn:btih:' + common.leaves.parsedTorrent.infoHash)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.add/remove: torrent file, buffer', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.torrent)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)
    client.remove(common.leaves.torrent)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.add/remove: info hash, hex string', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.ok(torrent.magnetURI.indexOf('magnet:?xt=urn:btih:' + common.leaves.parsedTorrent.infoHash) === 0)
    client.remove(common.leaves.parsedTorrent.infoHash)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.add/remove: info hash, buffer', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.parsedTorrent.infoHashBuffer)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.ok(torrent.magnetURI.indexOf('magnet:?xt=urn:btih:' + common.leaves.parsedTorrent.infoHash) === 0)
    client.remove(new Buffer(common.leaves.parsedTorrent.infoHash, 'hex'))
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.add/remove: parsed torrent, from `parse-torrent`', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.parsedTorrent)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)
    client.remove(common.leaves.parsedTorrent)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.add/remove: parsed torrent, with string type announce property', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var modifiedParsedTorrent = extend(common.leaves.parsedTorrent, {
    announce: common.leaves.parsedTorrent.announce[0]
  })
  var torrent = client.add(modifiedParsedTorrent)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    client.remove(common.leaves.parsedTorrent)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.remove: remove by Torrent object', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    client.remove(torrent)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('torrent.destroy: destroy and remove torrent', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    torrent.destroy()
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.seed: torrent file (Buffer)', function (t) {
  t.plan(4)

  var opts = {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: [
      'http://tracker.thepiratebay.org/announce',
      'udp://tracker.openbittorrent.com:80',
      'udp://tracker.ccc.de:80',
      'udp://tracker.publicbt.com:80',
      'udp://fr33domtracker.h33t.com:3310/announce',
      'http://tracker.bittorrent.am/announce'
    ]
  }

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(common.leaves.content, opts, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)
    client.remove(torrent)
    t.equal(client.torrents.length, 0)
    client.destroy()
  })
})

test('client.seed: torrent file (Blob)', function (t) {
  var opts = {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: [
      'http://tracker.thepiratebay.org/announce',
      'udp://tracker.openbittorrent.com:80',
      'udp://tracker.ccc.de:80',
      'udp://tracker.publicbt.com:80',
      'udp://fr33domtracker.h33t.com:3310/announce',
      'http://tracker.bittorrent.am/announce'
    ]
  }

  if (global.Blob !== undefined) {
    t.plan(4)
    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    client.seed(new global.Blob([ common.leaves.content ]), opts, function (torrent) {
      t.equal(client.torrents.length, 1)
      t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
      t.equal(torrent.magnetURI, common.leaves.magnetURI)
      client.remove(torrent)
      t.equal(client.torrents.length, 0)
      client.destroy()
    })
  } else {
    t.pass('Skipping Blob test because missing `Blob` constructor')
    t.end()
  }
})

test('after client.destroy(), throw on client.add() or client.seed()', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.destroy(function () {
    t.pass('client destroyed')
  })
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
  client.destroy(function () {
    t.pass('client destroyed')
  })
})
