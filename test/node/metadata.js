var fixtures = require('webtorrent-fixtures')
var test = require('tape')
var WebTorrent = require('../../')

test('ut_metadata transfer', function (t) {
  t.plan(6)

  var client1 = new WebTorrent({ dht: false, tracker: false })
  var client2 = new WebTorrent({ dht: false, tracker: false })

  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  client2.on('error', function (err) { t.fail(err) })
  client2.on('warning', function (err) { t.fail(err) })

  client1.on('torrent', function (torrent) {
    t.pass('client1 emits torrent event') // even though it started with metadata
    t.ok(torrent.metadata, 'metadata exists')
  })

  // client1 starts with metadata from torrent file
  client1.add(fixtures.leaves.torrent)

  client1.on('torrent', function (torrent1) {
    t.deepEqual(torrent1.info, fixtures.leaves.parsedTorrent.info)

    // client2 starts with infohash
    var torrent2 = client2.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent2.on('infoHash', function () {
      // manually add the peer
      torrent2.addPeer('127.0.0.1:' + client1.address().port)

      client2.on('torrent', function () {
        t.deepEqual(torrent1.info, torrent2.info)

        client1.destroy(function (err) {
          t.error(err, 'client1 destroyed')
        })
        client2.destroy(function (err) {
          t.error(err, 'client2 destroyed')
        })
      })
    })
  })
})
