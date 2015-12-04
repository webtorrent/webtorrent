var path = require('path')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var Torrent = require('../lib/torrent')
var WebTorrent = require('../')
var sinon = require('sinon')

var leavesPath = path.resolve(__dirname, 'torrents', 'leaves.torrent')
var leaves = fs.readFileSync(leavesPath)
var leavesTorrent = parseTorrent(leaves)
var leavesParsed = parseTorrent(leavesTorrent)

test('Torrent.progress shoud be 100% when torrent is done', function (t) {
  t.plan(2)

  var torrent_client = new WebTorrent({ tracker: false, dht: false })
  var currTorrent = torrent_client.add(leavesTorrent, function(_torrent){

    t.equal(currTorrent.progress, 1)
    t.equal(currTorrent.downloaded, currTorrent.length)
    torrent_client.destroy()
    t.end()
  })

})

test('Torrent.progress shoud be 0% when torrent has not started', function (t) {
  t.plan(2)

  var torrent_client = new WebTorrent({ tracker: false, dht: false })
  var currTorrent = torrent_client.add(leavesTorrent)

  currTorrent.once('infoHash', function () {
    t.equal(currTorrent.progress, 0)
    t.equal(currTorrent.downloaded, 0)
    torrent_client.destroy()
    t.end()
  })
})

test('Torrent._processParsedTorrent should update torrent with announce, urlList and new magnetURI and torrentFile', function (t) {
  t.plan(5)

  var torrent_client = new WebTorrent({ tracker: false, dht: false })
  var currTorrent = torrent_client.add(null, {
    announce: [ 'udp://tracker.openbittorrent.com:80', 'udp://tracker.openbittorrent.com:80' ],
    urlList: [ 'http://instant.io/mytorrent.torrent' ]
  })

  currTorrent._processParsedTorrent(leavesParsed)
  t.equal(currTorrent.magnetURI, parseTorrent.toMagnetURI(leavesParsed))
  t.deepEqual(currTorrent.torrentFile, parseTorrent.toTorrentFile(leavesParsed))
  t.notEqual(currTorrent.announce.indexOf('udp://tracker.openbittorrent.com:80') > -1)
  t.ok(currTorrent.announce.indexOf('udp://tracker.openbittorrent.com:80') > -1)
  t.equal(currTorrent.urlList.slice(-1)[0], 'http://instant.io/mytorrent.torrent')
  torrent_client.destroy()
  t.end()
})

test('Torrent._onMetadata should do nothing if torrent has metadata and is not being resumed', function (t) {
  t.plan(3)

  var torrent_client = new WebTorrent({ tracker: false, dht: false })
  var currTorrent = torrent_client.add(leavesParsed, {
    announce: [ 'udp://tracker.openbittorrent.com:80', 'udp://tracker.openbittorrent.com:80' ],
    urlList: [ 'http://instant.io/mytorrent.torrent' ]
  })

  currTorrent.on('ready', function () {
    var onStoreSpy = sinon.spy(currTorrent, "_onStore")
    t.ok(currTorrent.metadata)
    t.notOk(currTorrent.resumed)

    currTorrent._onMetadata(currTorrent)
    t.notOk(onStoreSpy.called, '_onStore should not have been called')  
    torrent_client.destroy()
    t.end()
  })

})

test('Torrent._onMetadata should reinitialize torrent if torrent was paused and resumed', function (t) {
  t.plan(6)

  var torrent_client = new WebTorrent({ tracker: false, dht: false })
  var currTorrent = torrent_client.add(leavesParsed, {
    announce: [ 'udp://tracker.openbittorrent.com:80', 'udp://tracker.openbittorrent.com:80' ],
    urlList: [ 'http://instant.io/mytorrent.torrent' ]
  })

  currTorrent.once('ready', function (_torrent) {
    var checkDoneSpy = sinon.spy(currTorrent, "_checkDone")
    var onStoreSpy = sinon.spy(currTorrent, "_onStore")
    var onErrorSpy = sinon.spy(currTorrent, "_onError")

    currTorrent.pause()
    currTorrent.resume()

    currTorrent._onMetadata(leavesParsed)
    currTorrent.once('ready', function () {
      t.pass('Torrent should be ready')
      t.ok(currTorrent.ready, 'torrent.ready should be true')
      t.ok(onStoreSpy.called, 'torrent._onStore should have been called')
      t.ok(checkDoneSpy.called, 'torrent._checkDone should have been called')
      t.notOk(onErrorSpy.called, 'torrent._onError should have not been called')
      t.ok(currTorrent.pieces.length > 0)
      torrent_client.destroy()
      t.end()
    })
  })
})

test('Torrent.pause should destroy swarm and stop discovery', function (t) {
  t.plan(6)

  var torrent_client = new WebTorrent({ tracker: false, dht: false })
  var currTorrent = torrent_client.add(leavesParsed, {
    announce: [ 'udp://tracker.openbittorrent.com:80', 'udp://tracker.openbittorrent.com:80' ],
    urlList: [ 'http://instant.io/mytorrent.torrent' ]
  })

  currTorrent.once('ready', function () {
    t.ok(currTorrent.swarm, 'torrent.swarm should exist before pause')
    t.ok(currTorrent.discovery, 'torrent.discovery should exist before pause')
    currTorrent.pause(function () {
      t.ok(currTorrent.paused, 'torrent.paused should be true')
      t.equal(currTorrent._rechokeIntervalId, null)
      t.ok(currTorrent.swarm.destroyed, 'torrent.swarm should be destroyed')
      t.notOk(!!currTorrent.discovery.tracker, 'torrent.discovery should be stopped')
      torrent_client.destroy()
      t.end()
    })
  })
})

test('Torrent._onMetadata should reinitialize torrent if metadata is deleted', function (t) {
  t.plan(5)

  var torrent_client = new WebTorrent({ tracker: false, dht: false })
  var currTorrent = torrent_client.add(leavesParsed, {
    announce: [ 'udp://tracker.openbittorrent.com:80', 'udp://tracker.openbittorrent.com:80' ],
    urlList: [ 'http://instant.io/mytorrent.torrent' ]
  })

  currTorrent.once('ready', function () {
    var onStoreSpy = sinon.spy(currTorrent, "_onStore")
    var onErrorSpy = sinon.spy(currTorrent, "_onError")

    currTorrent.metadata = null

    currTorrent._onMetadata(leavesParsed)
    currTorrent.once('ready', function () {
      t.pass('Torrent should be ready')
      t.ok(currTorrent.ready, 'torrent.ready should be true')
      t.ok(onStoreSpy.called, 'torrent._onStore should have been called')
      t.notOk(onErrorSpy.called, 'torrent._onError should have not been called')
      t.ok(currTorrent.pieces.length > 0)
      torrent_client.destroy()
      t.end()
    })
  })
})

