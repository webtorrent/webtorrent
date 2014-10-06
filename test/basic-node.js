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
