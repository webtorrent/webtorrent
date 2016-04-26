var extend = require('xtend')
var fixtures = require('webtorrent-fixtures')
var test = require('tape')
var WebTorrent = require('../')

test('client.add: duplicate trackers', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(fixtures.leaves.torrent, {
    announce: [ 'wss://example.com', 'wss://example.com', 'wss://example.com' ]
  })

  torrent.on('ready', function () {
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI + '&tr=' + encodeURIComponent('wss://example.com'))
    client.remove(fixtures.leaves.magnetURI, function (err) { t.error(err, 'torrent destroyed') })
    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: duplicate trackers, with multiple torrents', function (t) {
  t.plan(5)

  // Re-use this object, in case webtorrent is changing it
  var opts = {
    announce: [ 'wss://example.com', 'wss://example.com', 'wss://example.com' ]
  }

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent1 = client.add(fixtures.leaves.torrent, opts)

  torrent1.on('ready', function () {
    t.equal(torrent1.magnetURI, fixtures.leaves.magnetURI + '&tr=' + encodeURIComponent('wss://example.com'))

    var torrent2 = client.add(fixtures.alice.torrent, opts)

    torrent2.on('ready', function () {
      t.equal(torrent2.magnetURI, fixtures.alice.magnetURI + '&tr=' + encodeURIComponent('wss://example.com'))

      torrent1.destroy(function (err) { t.error(err, 'torrent1 destroyed') })
      torrent2.destroy(function (err) { t.error(err, 'torrent2 destroyed') })
      client.destroy(function (err) { t.error(err, 'client destroyed') })
    })
  })
})

test('client.add: duplicate trackers (including in .torrent file), multiple torrents', function (t) {
  t.plan(5)

  // Re-use this object, in case webtorrent is changing it
  var opts = {
    announce: [ 'wss://example.com', 'wss://example.com', 'wss://example.com' ]
  }

  // Include the duplicate trackers in the .torrent files
  var parsedTorrentLeaves = extend(fixtures.leaves.parsedTorrent)
  parsedTorrentLeaves.announce = [ 'wss://example.com', 'wss://example.com', 'wss://example.com' ]

  var parsedTorrentAlice = extend(fixtures.alice.parsedTorrent)
  parsedTorrentAlice.announce = [ 'wss://example.com', 'wss://example.com', 'wss://example.com' ]

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent1 = client.add(parsedTorrentLeaves, opts)

  torrent1.on('ready', function () {
    t.equal(torrent1.magnetURI, fixtures.leaves.magnetURI + '&tr=' + encodeURIComponent('wss://example.com'))

    var torrent2 = client.add(parsedTorrentAlice, opts)

    torrent2.on('ready', function () {
      t.equal(torrent2.magnetURI, fixtures.alice.magnetURI + '&tr=' + encodeURIComponent('wss://example.com'))

      torrent1.destroy(function (err) { t.error(err, 'torrent1 destroyed') })
      torrent2.destroy(function (err) { t.error(err, 'torrent2 destroyed') })
      client.destroy(function (err) { t.error(err, 'client destroyed') })
    })
  })
})
