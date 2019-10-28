var fixtures = require('webtorrent-fixtures')
var test = require('tape')
var WebTorrent = require('../')

test('client.add: magnet uri, utf-8 string', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(fixtures.leaves.magnetURI)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    client.remove(fixtures.leaves.magnetURI, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: torrent file, buffer', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(fixtures.leaves.torrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    client.remove(fixtures.leaves.torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: info hash, hex string', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, 'magnet:?xt=urn:btih:' + fixtures.leaves.parsedTorrent.infoHash)

    client.remove(fixtures.leaves.parsedTorrent.infoHash, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: info hash, buffer', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(fixtures.leaves.parsedTorrent.infoHashBuffer)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.ok(torrent.magnetURI.indexOf('magnet:?xt=urn:btih:' + fixtures.leaves.parsedTorrent.infoHash) === 0)

    client.remove(Buffer.from(fixtures.leaves.parsedTorrent.infoHash, 'hex'), function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: parsed torrent, from `parse-torrent`', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(fixtures.leaves.parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    client.remove(fixtures.leaves.parsedTorrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: parsed torrent, with string type announce property', function (t) {
  t.plan(7)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)
  parsedTorrent.announce = 'http://tracker.local:80'

  var torrent = client.add(parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)

    var expectedMagnetURI = fixtures.leaves.magnetURI +
      '&tr=' + encodeURIComponent('http://tracker.local:80')
    t.equal(torrent.magnetURI, expectedMagnetURI)

    // `torrent.announce` must always be an array
    t.deepEqual(torrent.announce, ['http://tracker.local:80'])

    client.remove(fixtures.leaves.parsedTorrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: parsed torrent, with array type announce property', function (t) {
  t.plan(7)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)
  parsedTorrent.announce = ['http://tracker.local:80', 'http://tracker.local:81']

  var torrent = client.add(parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)

    var expectedMagnetURI = fixtures.leaves.magnetURI +
      '&tr=' + encodeURIComponent('http://tracker.local:80') +
      '&tr=' + encodeURIComponent('http://tracker.local:81')
    t.equal(torrent.magnetURI, expectedMagnetURI)

    t.deepEqual(torrent.announce, ['http://tracker.local:80', 'http://tracker.local:81'])

    client.remove(fixtures.leaves.parsedTorrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
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

  client.add(Buffer.from('abc'))
})

test('client.add: non-bittorrent URNs', function (t) {
  const magnets = [
    'magnet:?xt=urn:sha1:PDAQRAOQQRYS76MRZJ33LK4MMVZBDSCL',
    'magnet:?xt=urn:tree:tiger:IZZG2KNL4BKA7LYEKK5JAX6BQ27UV4QZKPL2JZQ',
    'magnet:?xt=urn:bitprint:QBMYI5FTYSFFSP7HJ37XALYNNVYLJE27.E6ITPBX6LSBBW34T3UGPIVJDNNJZIQOMP5WNEUI',
    'magnet:?xt=urn:ed2k:31D6CFE0D16AE931B73C59D7E0C089C0',
    'magnet:?xt=urn:aich:D6EUDGK2DBTBEZ2XVN3G6H4CINSTZD7M',
    'magnet:?xt=urn:kzhash:35759fdf77748ba01240b0d8901127bfaff929ed1849b9283f7694b37c192d038f535434',
    'magnet:?xt=urn:md5:4e7bef74677be349ccffc6a178e38299'
  ]

  t.plan(magnets.length * 2 + 1)

  var done = 0
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) {
    t.ok(err instanceof Error)
    t.ok(err.message.indexOf('Invalid torrent identifier') >= 0)

    done += 1

    if (done === magnets.length) client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
  client.on('warning', function (err) { t.fail(err) })

  // Non-bittorrent URNs (examples from Wikipedia)
  magnets.forEach(function (magnet) {
    client.add(magnet)
  })
})
