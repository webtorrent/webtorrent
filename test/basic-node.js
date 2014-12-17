var WebTorrent = require('../')
var fs = require('fs')
var http = require('http')
var parseTorrent = require('parse-torrent')
var portfinder = require('portfinder')
var test = require('tape')

var leavesPath = __dirname + '/torrents/leaves.torrent'
var leaves = fs.readFileSync(leavesPath)
var leavesTorrent = parseTorrent(leaves)
var leavesBookPath = __dirname + '/content/Leaves of Grass by Walt Whitman.epub'
var numbersPath = __dirname + '/content/numbers'

test('client.add (http url to a torrent file (string))', function (t) {
  t.plan(1)

  var server = http.createServer(function (req, res) {
    res.end(leaves)
  })

  portfinder.getPort(function (err, port) {
    if (err) throw err
    server.listen(port, function () {
      var url = 'http://127.0.0.1:' + port
      var client = new WebTorrent({ dht: false, tracker: false })
      client.add(url, function (torrent) {
        t.equal(torrent.infoHash, leavesTorrent.infoHash)
        client.destroy()
        server.close()
      })
    })
  })
})

test('client.add (filesystem path to a torrent file (string))', function (t) {
  t.plan(1)

  var client = new WebTorrent({ dht: false, tracker: false })
  client.add(leavesPath, function (torrent) {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    client.destroy()
  })
})

test('client.seed (filesystem path to file (string))', function (t) {
  t.plan(1)

  var client = new WebTorrent({ dht: false, tracker: false })
  client.seed(leavesBookPath, function (torrent) {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    client.destroy()
  })
})

test('client.seed (filesystem path to folder (string))', function (t) {
  t.plan(1)

  var opts = {
    pieceLength: 32768, // force piece length to 32KB so info-hash will
                        // match what transmission generated, since we use
                        // a different algo for picking piece length

    private: false      // also force `private: false` to match transmission
  }

  var client = new WebTorrent({ dht: false, trackers: false })
  client.seed(numbersPath, opts, function (torrent) {
    t.equal(torrent.infoHash, '80562f38656b385ea78959010e51a2cc9db41ea0')
    client.destroy()
  })
})
