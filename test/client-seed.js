import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../index.js'

test('client.seed: torrent file (Buffer)', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, async torrent => {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    await client.remove(torrent, err => { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.seed: torrent file (Buffer), set name on buffer', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const buf = Buffer.from(fixtures.leaves.content)
  buf.name = 'Leaves of Grass by Walt Whitman.epub'

  client.seed(buf, { announce: [] }, async torrent => {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    await client.remove(torrent, err => { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.seed: torrent file (Blob)', t => {
  if (typeof Blob === 'undefined') return t.end()

  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(new Blob([fixtures.leaves.content]), {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, async torrent => {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    await client.remove(torrent, err => { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.seed: duplicate seed', t => {
  t.plan(4)

  const client = new WebTorrent()

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.leaves.content, function (torrent1) {
    client.seed(fixtures.leaves.content, function (torrent2) {
      t.equal(torrent1, torrent2)
      t.equal(client.torrents.length, 1)

      client.destroy(err => { t.error(err, 'client destroyed') })
      t.equal(client.torrents.length, 0)
    })
  })
})
