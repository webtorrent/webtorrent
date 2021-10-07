const fixtures = require('webtorrent-fixtures')
const test = require('tape')
const WebTorrent = require('../../index.js')

test('ut_metadata transfer', t => {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  client1.on('torrent', torrent => {
    t.pass('client1 emits torrent event') // even though it started with metadata
    t.ok(torrent.metadata, 'metadata exists')
  })

  // client1 starts with metadata from torrent file
  client1.add(fixtures.leaves.torrent)

  client1.on('torrent', torrent1 => {
    t.deepEqual(torrent1.info, fixtures.leaves.parsedTorrent.info)

    // client2 starts with infohash
    const torrent2 = client2.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent2.on('infoHash', () => {
      // manually add the peer
      torrent2.addPeer(`127.0.0.1:${client1.address().port}`)

      client2.on('torrent', () => {
        t.deepEqual(torrent1.info, torrent2.info)

        client1.destroy(err => {
          t.error(err, 'client1 destroyed')
        })
        client2.destroy(err => {
          t.error(err, 'client2 destroyed')
        })
      })
    })
  })
})
