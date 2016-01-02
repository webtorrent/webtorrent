var common = require('../common')
var http = require('http')
var test = require('tape')
var WebTorrent = require('../../')

test('WebTorrent.WEBRTC_SUPPORT', function (t) {
  t.plan(2)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  t.equal(WebTorrent.WEBRTC_SUPPORT, false)

  client.destroy(function (err) {
    t.error(err, 'client destroyed')
  })
})

test('client.add: http url to a torrent file, string', function (t) {
  t.plan(8)

  var server = http.createServer(function (req, res) {
    t.ok(req.headers['user-agent'].indexOf('WebTorrent') !== -1)
    res.end(common.leaves.torrent)
  })

  server.listen(0, function () {
    var port = server.address().port
    var url = 'http://127.0.0.1:' + port
    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    client.add(url, function (torrent) {
      t.equal(client.torrents.length, 1)
      t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
      t.equal(torrent.magnetURI, common.leaves.magnetURI)

      client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
      t.equal(client.torrents.length, 0)

      server.close(function () { t.pass('http server closed') })
      client.destroy(function (err) { t.error(err, 'client destroyed') })
    })
  })
})

test('client.add: filesystem path to a torrent file, string', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.add(common.leaves.torrentPath, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)

    client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.seed: filesystem path to file, string', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(common.leaves.contentPath, {
    name: 'Leaves of Grass by Walt Whitman.epub'
  }, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)

    client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.seed: filesystem path to folder with one file, string', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(common.folder.contentPath, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, common.folder.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.folder.magnetURI)

    client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.seed: filesystem path to folder with multiple files, string', function (t) {
  t.plan(6)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(common.numbers.contentPath, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, common.numbers.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.numbers.magnetURI)

    client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: invalid torrent id: invalid filesystem path', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) {
    t.ok(err instanceof Error)
    t.ok(err.message.indexOf('Invalid torrent identifier') >= 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
  client.on('warning', function (err) { t.fail(err) })

  client.add('/invalid/filesystem/path/123')
})
