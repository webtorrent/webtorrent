var common = require('../common')
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
  client1.add(common.leaves.torrent)

  client1.on('torrent', function (torrent1) {
    t.deepEqual(torrent1.info, common.leaves.parsedTorrent.info)

    // client2 starts with infohash
    client2.add(common.leaves.parsedTorrent.infoHash)

    client2.on('listening', function (port, torrent2) {
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
