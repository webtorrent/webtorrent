import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../index.js'

test('client.seed followed by duplicate client.add (sync)', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent1 => {
    t.equal(client.torrents.length, 1)

    const torrent2 = client.add(torrent1.infoHash)

    torrent2.once('ready', () => {
      t.fail('torrent ready is not called')
    })

    torrent2.once('error', err => {
      t.ok(err, 'got expected error on duplicate add')
      t.equal(client.torrents.length, 1)
      t.ok(torrent2.destroyed)
      client.destroy(err => {
        t.error(err, 'destroyed client')
        t.equal(client.torrents.length, 0)
      })
    })
  })
})

test('client.seed followed by duplicate client.add (async)', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent1 => {
    t.equal(client.torrents.length, 1)

    const torrent2 = client.add(fixtures.leaves.torrentPath)

    torrent2.once('ready', () => {
      t.fail('torrent ready is not called')
    })

    torrent2.once('error', err => {
      t.ok(err, 'got expected error on duplicate add')
      t.equal(client.torrents.length, 1)
      t.ok(torrent2.destroyed)
      client.destroy(err => {
        t.error(err, 'destroyed client')
        t.equal(client.torrents.length, 0)
      })
    })
  })
})

test('client.seed followed by two duplicate client.add calls (sync)', t => {
  t.plan(9)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent1 => {
    t.equal(client.torrents.length, 1)

    const torrent2 = client.add(torrent1.infoHash)

    torrent2.once('ready', () => {
      t.fail('torrent ready is not called')
    })

    torrent2.once('error', err => {
      t.ok(err, 'got expected error on duplicate add')
      t.equal(client.torrents.length, 1)
      t.ok(torrent2.destroyed)

      const torrent3 = client.add(torrent1.infoHash)

      torrent3.once('ready', () => {
        t.fail('torrent ready is not called')
      })

      torrent3.once('error', err => {
        t.ok(err, 'got expected error on duplicate add')
        t.equal(client.torrents.length, 1)
        t.ok(torrent3.destroyed)
        client.destroy(err => {
          t.error(err, 'destroyed client')
          t.equal(client.torrents.length, 0)
        })
      })
    })
  })
})

test('client.seed followed by two duplicate client.add calls (async)', t => {
  t.plan(9)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent1 => {
    t.equal(client.torrents.length, 1)

    const torrent2 = client.add(fixtures.leaves.torrentPath)

    torrent2.once('ready', () => {
      t.fail('torrent ready is not called')
    })

    torrent2.once('error', err => {
      t.ok(err, 'got expected error on duplicate add')
      t.equal(client.torrents.length, 1)
      t.ok(torrent2.destroyed)

      const torrent3 = client.add(fixtures.leaves.torrentPath)

      torrent3.once('ready', () => {
        t.fail('torrent ready is not called')
      })

      torrent3.once('error', err => {
        t.ok(err, 'got expected error on duplicate add')
        t.equal(client.torrents.length, 1)
        t.ok(torrent3.destroyed)
        client.destroy(err => {
          t.error(err, 'destroyed client')
          t.equal(client.torrents.length, 0)
        })
      })
    })
  })
})

test('successive sync client.add, client.remove, client.add, client.remove (sync)', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent1 => {
    t.equal(client.torrents.length, 1)

    client.remove(torrent1.infoHash, () => {
      client.add(torrent1.infoHash)
      client.remove(torrent1.infoHash, () => {
        client.destroy(err => {
          t.error(err, 'destroyed client')
          t.equal(client.torrents.length, 0)
        })
      })
    })
  })
})
