import test from 'tape'
import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import dgram from 'dgram'
import WebTorrent from '../../index.js'

test('client.conn-pool: use TCP when uTP disabled', t => {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  })

  client2.on('listening', () => {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    let order = 0

    torrent.on('infoHash', () => {
      // Manually connect peers
      torrent.addPeer(`127.0.0.1:${client2.address().port}`)
      t.equal(++order, 1)
    })

    torrent.on('metadata', () => {
      t.equal(++order, 2)
    })

    torrent.on('ready', () => {
      t.equal(++order, 3)
    })

    torrent.on('done', () => {
      t.equal(++order, 4)

      client1.destroy(err => { t.error(err, 'client 1 destroyed') })
      client2.destroy(err => { t.error(err, 'client 2 destroyed') })
    })
  })
})

test('client.conn-pool: use uTP when uTP enabled', t => {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: true })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: true })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  })

  client2.on('listening', () => {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    let order = 0

    torrent.on('infoHash', () => {
      // Manually connect peers
      torrent.addPeer(`127.0.0.1:${client2.address().port}`)
      t.equal(++order, 1)
    })

    torrent.on('metadata', () => {
      t.equal(++order, 2)
    })

    torrent.on('ready', () => {
      t.equal(++order, 3)
    })

    torrent.on('done', () => {
      t.equal(++order, 4)

      client1.destroy(err => { t.error(err, 'client 1 destroyed') })
      client2.destroy(err => { t.error(err, 'client 2 destroyed') })
    })
  })
})

test('client.conn-pool: adding IPv6 peer when uTP enabled should fallback to TCP', t => {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: true })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: true })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  })

  client2.on('listening', () => {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    let order = 0

    torrent.on('infoHash', () => {
      // Manually connect peers
      torrent.addPeer(`[::1]:${client2.address().port}`)
      t.equal(++order, 1)
    })

    torrent.on('metadata', () => {
      t.equal(++order, 2)
    })

    torrent.on('ready', () => {
      t.equal(++order, 3)
    })

    torrent.on('done', () => {
      t.equal(++order, 4)

      client1.destroy(err => { t.error(err, 'client 1 destroyed') })
      client2.destroy(err => { t.error(err, 'client 2 destroyed') })
    })
  })
})

// Warning: slow test as we need to rely on connection timeouts
test('client.conn-pool: fallback to TCP when uTP server failed', t => {
  t.plan(7)

  // force uTP server failure
  const server = dgram.createSocket('udp4')
  server.bind(63000)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: true, torrentPort: 63000 })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })

  client1.on('error', err => { t.equal(err.toString(), 'Error: address already in use') })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  })

  client2.on('listening', () => {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    let order = 0

    torrent.on('infoHash', () => {
      // Manually connect peers
      torrent.addPeer(`127.0.0.1:${client2.address().port}`)
      t.equal(++order, 1)
    })

    torrent.on('metadata', () => {
      t.equal(++order, 2)
    })

    torrent.on('ready', () => {
      t.equal(++order, 3)
    })

    torrent.on('done', () => {
      t.equal(++order, 4)

      client1.destroy(err => { t.error(err, 'client 1 destroyed') })
      client2.destroy(err => { t.error(err, 'client 2 destroyed') })

      server.close()
    })
  })
})

// Warning: slow test as we need to rely on connection timeouts
test('client.conn-pool: fallback to TCP when remote client has uTP disabled', t => {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: true })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  })

  client2.on('listening', () => {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    let order = 0

    torrent.on('infoHash', () => {
      // Manually connect peers
      torrent.addPeer(`127.0.0.1:${client2.address().port}`)
      t.equal(++order, 1)
    })

    torrent.on('metadata', () => {
      t.equal(++order, 2)
    })

    torrent.on('ready', () => {
      t.equal(++order, 3)
    })

    torrent.on('done', () => {
      t.equal(++order, 4)

      client1.destroy(err => { t.error(err, 'client 1 destroyed') })
      client2.destroy(err => { t.error(err, 'client 2 destroyed') })
    })
  })
})
