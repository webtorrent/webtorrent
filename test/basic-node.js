var WebTorrent = require('../')
var fs = require('fs')
var http = require('http')
var parseTorrent = require('parse-torrent')
var test = require('tape')

var leavesPath = __dirname + '/torrents/leaves.torrent'
var leaves = fs.readFileSync(leavesPath)
var leavesTorrent = parseTorrent(leaves)
var leavesBookPath = __dirname + '/content/Leaves of Grass by Walt Whitman.epub'
var numbersPath = __dirname + '/content/numbers'
var leavesMagnetURI = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&dn=Leaves+of+Grass+by+Walt+Whitman.epub&tr=http%3A%2F%2Ftracker.thepiratebay.org%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ffr33domtracker.h33t.com%3A3310%2Fannounce&tr=http%3A%2F%2Ftracker.bittorrent.am%2Fannounce'

test('client.add (http url to a torrent file (string))', function (t) {
  t.plan(3)

  var server = http.createServer(function (req, res) {
    t.equal(req.headers['user-agent'], 'WebTorrent (http://webtorrent.io)')
    res.end(leaves)
  })

  server.listen(0, function () {
    var port = server.address().port
    var url = 'http://127.0.0.1:' + port
    var client = new WebTorrent({ dht: false, tracker: false })
    client.add(url, function (torrent) {
      t.equal(torrent.infoHash, leavesTorrent.infoHash)
      t.equal(torrent.magnetURI, leavesMagnetURI)
      client.destroy()
      server.close()
    })
  })
})

test('client.add (filesystem path to a torrent file (string))', function (t) {
  t.plan(2)

  var client = new WebTorrent({ dht: false, tracker: false })
  client.add(leavesPath, function (torrent) {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    t.equal(torrent.magnetURI, leavesMagnetURI)
    client.destroy()
  })
})

test('client.seed (filesystem path to file (string))', function (t) {
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
  client.seed(leavesBookPath, opts, function (torrent) {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    t.equal(torrent.magnetURI, leavesMagnetURI)
    client.destroy()
  })
})

test('client.seed (filesystem path to folder (string))', function (t) {
  t.plan(2)

  var opts = {
    pieceLength: 32768, // force piece length to 32KB so info-hash will
                        // match what transmission generated, since we use
                        // a different algo for picking piece length

    private: false      // also force `private: false` to match transmission
  }

  var client = new WebTorrent({ dht: false, tracker: false })
  client.seed(numbersPath, opts, function (torrent) {
    t.equal(torrent.infoHash, '80562f38656b385ea78959010e51a2cc9db41ea0')
    t.equal(torrent.magnetURI, 'magnet:?xt=urn:btih:80562f38656b385ea78959010e51a2cc9db41ea0&dn=numbers&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.webtorrent.io%3A80&tr=wss%3A%2F%2Ftracker.webtorrent.io')
    client.destroy()
  })
})
