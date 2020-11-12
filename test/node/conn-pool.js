const test = require('tape')
const fixtures = require('webtorrent-fixtures')
const WebTorrent = require('../../')
const MemoryChunkStore = require('memory-chunk-store')
const dgram = require('dgram')

test('client.conn-pool: use TCP when uTP disabled', function (t) {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })

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

test('client.conn-pool: use uTP when uTP enabled', function (t) {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: true })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: true })

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

// Warning: slow test as we need to rely on connection timeouts
test('client.conn-pool: fallback to TCP when uTP server failed', function (t) {
  t.plan(6)

  // force uTP server failure
  const server = dgram.createSocket('udp4')
  server.bind(63000)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: true, torrentPort: 63000 })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })

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

      server.close()
    })
  })
})

// Warning: slow test as we need to rely on connection timeouts
test('client.conn-pool: fallback to TCP when remote client has uTP disabled', function (t) {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: true })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })

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
