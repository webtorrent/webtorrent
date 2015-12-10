var common = require('./common')
var http = require('http')
var test = require('tape')
var WebTorrent = require('../')

test('client.add: http url to a torrent file, string', function (t) {
  t.plan(3)

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
      t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
      t.equal(torrent.magnetURI, common.leaves.magnetURI)
      client.destroy()
      server.close()
    })
  })
})

test('client.add: filesystem path to a torrent file, string', function (t) {
  t.plan(2)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.add(common.leaves.torrentPath, function (torrent) {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)
    client.destroy()
  })
})

test('client.seed: filesystem path to file, string', function (t) {
  t.plan(2)

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

  client.seed(common.leaves.contentPath, opts, function (torrent) {
    t.equal(torrent.infoHash, common.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, common.leaves.magnetURI)
    client.destroy()
  })
})

test('client.seed: filesystem path to folder with one file, string', function (t) {
  t.plan(2)

  var opts = {
    pieceLength: 32768, // force piece length to 32KB so info-hash will
                        // match what transmission generated, since we use
                        // a different algo for picking piece length

    private: false,     // also force `private: false` to match transmission
    announce: [
      'udp://tracker.webtorrent.io:80'
    ]
  }

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(common.folder.contentPath, opts, function (torrent) {
    t.equal(torrent.infoHash, '3a686c32404af0a66913dd5f8d2b40673f8d4490')
    t.equal(torrent.magnetURI, 'magnet:?xt=urn:btih:3a686c32404af0a66913dd5f8d2b40673f8d4490&dn=folder&tr=udp%3A%2F%2Ftracker.webtorrent.io%3A80')
    client.destroy()
  })
})

test('client.seed: filesystem path to folder with multiple files, string', function (t) {
  t.plan(2)

  var opts = {
    pieceLength: 32768, // force piece length to 32KB so info-hash will
                        // match what transmission generated, since we use
                        // a different algo for picking piece length

    private: false,     // also force `private: false` to match transmission
    announce: [
      'udp://tracker.webtorrent.io:80'
    ]
  }

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(common.numbers.contentPath, opts, function (torrent) {
    t.equal(torrent.infoHash, '80562f38656b385ea78959010e51a2cc9db41ea0')
    t.equal(torrent.magnetURI, 'magnet:?xt=urn:btih:80562f38656b385ea78959010e51a2cc9db41ea0&dn=numbers&tr=udp%3A%2F%2Ftracker.webtorrent.io%3A80')
    client.destroy()
  })
})
