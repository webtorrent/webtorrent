var WebTorrent = require('../')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')

var leaves = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
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
