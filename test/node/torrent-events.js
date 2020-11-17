const fixtures = require('webtorrent-fixtures')
const test = require('tape')
const WebTorrent = require('../../')
const MemoryChunkStore = require('memory-chunk-store')

test('client.add: emit torrent events in order', function (t) {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  client2.on('error', function (err) { t.fail(err) })
  client2.on('warning', function (err) { t.fail(err) })

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  })

  client2.on('listening', function () {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    // Manually connect peers
    torrent.addPeer('127.0.0.1:' + client2.address().port)

    let order = 0

    torrent.on('infoHash', function () {
      t.equal(++order, 1)
    })

    torrent.on('metadata', function () {
      t.equal(++order, 2)
    })

    torrent.on('ready', function () {
      t.equal(++order, 3)
    })

    torrent.on('done', function () {
      t.equal(++order, 4)

      client1.destroy(function (err) { t.error(err, 'client 1 destroyed') })
      client2.destroy(function (err) { t.error(err, 'client 2 destroyed') })
    })
  })
})

test('client.seed: emit torrent events in order', function (t) {
  t.plan(5)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  const torrent = client.seed(fixtures.leaves.content)

  let order = 0

  torrent.on('infoHash', function () {
    t.equal(++order, 1)
  })

  torrent.on('metadata', function () {
    t.equal(++order, 2)
  })

  torrent.on('ready', function () {
    t.equal(++order, 3)
  })

  torrent.on('done', function () {
    t.equal(++order, 4)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})
