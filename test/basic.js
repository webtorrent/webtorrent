var WebTorrent = require('../')
var fs = require('fs')
var http = require('http')
var parseTorrent = require('parse-torrent')
var portfinder = require('portfinder')
var test = require('tape')

var leavesPath = __dirname + '/torrents/leaves.torrent'
var leaves = fs.readFileSync(leavesPath)
var leavesTorrent = parseTorrent(leaves)

function verify (t, client, torrent) {
  t.equal(torrent.infoHash, leavesTorrent.infoHash)
  client.destroy()
}

test('client.add (magnet uri, torrent file, info hash, and parsed torrent)', function (t) {
  t.plan(5)

  // magnet uri (utf8 string)
  var client1 = new WebTorrent({ dht: false, trackers: false })
  verify(t, client1, client1.add('magnet:?xt=urn:btih:' + leavesTorrent.infoHash))

  // torrent file (buffer)
  var client2 = new WebTorrent({ dht: false, trackers: false })
  verify(t, client2, client2.add(leaves))

  // info hash (hex string)
  var client3 = new WebTorrent({ dht: false, trackers: false })
  verify(t, client3, client3.add(leavesTorrent.infoHash))

  // info hash (buffer)
  var client4 = new WebTorrent({ dht: false, trackers: false })
  verify(t, client4, client4.add(new Buffer(leavesTorrent.infoHash, 'hex')))

  // parsed torrent (from parse-torrent)
  var client5 = new WebTorrent({ dht: false, trackers: false })
  verify(t, client5, client5.add(leavesTorrent))

})

test('client.add (http url to a torrent file (string))', function (t) {
  t.plan(1)

  var server = http.createServer(function (req, res) {
    res.end(leaves)
  })

  portfinder.getPort(function (err, port) {
    if (err) throw err
    server.listen(port, function () {
      var url = 'http://127.0.0.1:' + port
      var client1 = new WebTorrent({ dht: false, trackers: false })
      client1.add(url, function (torrent) {
        verify(t, client1, torrent)
        server.close()
      })
    })
  })
})

test('client.add (filesystem path to a torrent file (string))', function (t) {
  t.plan(1)

  var client1 = new WebTorrent({ dht: false, trackers: false })
  client1.add(leavesPath, function (torrent) {
    verify(t, client1, torrent)
  })
})
