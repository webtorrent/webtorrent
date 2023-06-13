import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import MemoryChunkStore from 'memory-chunk-store'
import randombytes from 'randombytes'
import WebTorrent from '../../index.js'

test('client.add: emit torrent events in order', t => {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

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

test('client.seed: emit torrent events in order', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.seed(fixtures.leaves.content)

  let order = 0

  torrent.on('infoHash', () => {
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
  })
  torrent.on('seed', () => {
    t.equal(++order, 5)
    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('file.select: check multiple done events', t => {
  t.plan(5)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  const fileA = Buffer.from(randombytes(16 * 1024).toString('hex'))
  const fileB = Buffer.from(randombytes(16 * 1024).toString('hex'))

  // Start seeding
  client2.seed([fileA, fileB], { announce: [] }, seedTorrent => {
    // Select only fileA (index 0)
    const magnet = seedTorrent.magnetURI + '&so=0'

    // Start downloading
    const torrent = client1.add(magnet, { store: MemoryChunkStore })

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
      ++order

      if (order === 4) {
        torrent.files[1].select(0)
      } else if (order === 5) {
        client1.destroy(err => { t.error(err, 'client 1 destroyed') })
        client2.destroy(err => { t.error(err, 'client 2 destroyed') })
      }
    })
  })
})
