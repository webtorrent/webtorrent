var BitTorrentClient = require('../')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var fs = require('fs')

var leaves = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesTorrent = parseTorrent(leaves)

test('Test supported torrentInfo types', function (t) {
  t.plan(5)

  function verify (client, torrent) {
    t.equal(torrent.infoHash, leavesTorrent.infoHash)
    client.destroy()
  }

  // info hash (as a hex string)
  var client1 = new BitTorrentClient({ dht: false, trackers: false })
  verify(client1, client1.add(leavesTorrent.infoHash))

  // info hash (as a Buffer)
  var client2 = new BitTorrentClient({ dht: false, trackers: false })
  verify(client2, client2.add(new Buffer(leavesTorrent.infoHash, 'hex')))

  // magnet uri (as a utf8 string)
  var client3 = new BitTorrentClient({ dht: false, trackers: false })
  verify(client3, client3.add('magnet:?xt=urn:btih:' + leavesTorrent.infoHash))

  // .torrent file (as a Buffer)
  var client4 = new BitTorrentClient({ dht: false, trackers: false })
  verify(client4, client4.add(leaves))

  // parsed torrent (as an Object)
  var client5 = new BitTorrentClient({ dht: false, trackers: false })
  verify(client5, client5.add(leavesTorrent))
})
