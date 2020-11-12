const fixtures = require('webtorrent-fixtures')
const test = require('tape')
const WebTorrent = require('../')

test('client.add: magnet uri, utf-8 string', function (t) {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  const torrent = client.add(fixtures.leaves.magnetURI)
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

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  const torrent = client.add(fixtures.leaves.torrent)
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

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)
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

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent.infoHashBuffer)
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

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent)
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

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)
  parsedTorrent.announce = 'http://tracker.local:80'

  const torrent = client.add(parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)

    const expectedMagnetURI = fixtures.leaves.magnetURI +
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

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)
  parsedTorrent.announce = ['http://tracker.local:80', 'http://tracker.local:81']

  const torrent = client.add(parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', function () {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)

    const expectedMagnetURI = fixtures.leaves.magnetURI +
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

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

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

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) {
    t.ok(err instanceof Error)
    t.ok(err.message.indexOf('Invalid torrent identifier') >= 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
  client.on('warning', function (err) { t.fail(err) })

  client.add(Buffer.from('abc'))
})
