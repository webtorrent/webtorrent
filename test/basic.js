var fs = require('fs')
var extend = require('xtend')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var WebTorrent = require('../')

var leaves = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesTorrent = parseTorrent(leaves)
var leavesBook = fs.readFileSync(__dirname + '/content/Leaves of Grass by Walt Whitman.epub')

var leavesMagnetURI = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&dn=Leaves+of+Grass+by+Walt+Whitman.epub&tr=http%3A%2F%2Ftracker.bittorrent.am%2Fannounce&tr=http%3A%2F%2Ftracker.thepiratebay.org%2Fannounce&tr=udp%3A%2F%2Ffr33domtracker.h33t.com%3A3310%2Fannounce&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80'

test('client.add/remove: magnet uri, utf-8 string', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add('magnet:?xt=urn:btih:' + leavesTorrent.infoHash)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    t.ok(torrent.magnetURI.indexOf('magnet:?xt=urn:btih:' + leavesTorrent.infoHash) === 0)
    client.remove('magnet:?xt=urn:btih:' + leavesTorrent.infoHash)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.add/remove: torrent file, buffer', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(leaves)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    t.equal(torrent.magnetURI, leavesMagnetURI)
    client.remove(leaves)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.add/remove: info hash, hex string', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(leavesTorrent.infoHash)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    t.ok(torrent.magnetURI.indexOf('magnet:?xt=urn:btih:' + leavesTorrent.infoHash) === 0)
    client.remove(leavesTorrent.infoHash)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.add/remove: info hash, buffer', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(new Buffer(leavesTorrent.infoHash, 'hex'))
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    t.ok(torrent.magnetURI.indexOf('magnet:?xt=urn:btih:' + leavesTorrent.infoHash) === 0)
    client.remove(new Buffer(leavesTorrent.infoHash, 'hex'))
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.add/remove: parsed torrent, from `parse-torrent`', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(leavesTorrent)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    t.equal(torrent.magnetURI, leavesMagnetURI)
    client.remove(leavesTorrent)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.add/remove: parsed torrent, with string type announce property', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var modifiedParsedTorrent = extend(leavesTorrent, {
    announce: leavesTorrent.announce[0]
  })
  var torrent = client.add(modifiedParsedTorrent)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    client.remove(leavesTorrent)
    t.equal(client.torrents.length, 0)
    client.destroy()
    t.end()
  })
})

test('client.remove: remove by Torrent object', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(leavesTorrent.infoHash)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
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

  var torrent = client.add(leavesTorrent.infoHash)
  t.equal(client.torrents.length, 1)
  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
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

  client.seed(leavesBook, opts, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    t.equal(torrent.magnetURI, leavesMagnetURI)
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

    client.seed(new global.Blob([ leavesBook ]), opts, function (torrent) {
      t.equal(client.torrents.length, 1)
      t.equal(torrent.infoHash, leavesTorrent.infoHash)
      t.equal(torrent.magnetURI, leavesMagnetURI)
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
    client.add('magnet:?xt=urn:btih:' + leavesTorrent.infoHash)
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

  client.add(leaves, { name: 'leaves' }, function () {
    t.fail('unexpected "torrent" event (from add)')
  })
  client.seed(leavesBook, { name: 'leavesBook' }, function () {
    t.fail('unexpected "torrent" event (from seed)')
  })
  client.on('ready', function () {
    t.fail('unexpected "ready" event')
  })
  client.destroy(function () {
    t.pass('client destroyed')
  })
})
