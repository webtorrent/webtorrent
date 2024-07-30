import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../index.js'

test('client.add: magnet uri, utf-8 string', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.magnetURI)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', async () => {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    await client.remove(fixtures.leaves.magnetURI, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.add: torrent file, buffer', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.torrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', async () => {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    await client.remove(fixtures.leaves.torrent, err => { t.error(err, 'torrent destroyed') })
    console.log(client.torrents.length)
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.add: info hash, hex string', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', async () => {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, `magnet:?xt=urn:btih:${fixtures.leaves.parsedTorrent.infoHash}`)

    await client.remove(fixtures.leaves.parsedTorrent.infoHash, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.add: info hash, buffer', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent.infoHashBuffer)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', async () => {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.ok(torrent.magnetURI.indexOf(`magnet:?xt=urn:btih:${fixtures.leaves.parsedTorrent.infoHash}`) === 0)

    await client.remove(Buffer.from(fixtures.leaves.parsedTorrent.infoHash, 'hex'), err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.add: parsed torrent, from `parse-torrent`', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', async () => {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    await client.remove(fixtures.leaves.parsedTorrent, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.add: parsed torrent, with string type announce property', t => {
  t.plan(7)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)
  parsedTorrent.announce = 'http://tracker.local:80'

  const torrent = client.add(parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', async () => {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)

    const expectedMagnetURI = `${fixtures.leaves.magnetURI}&tr=${encodeURIComponent('http://tracker.local:80')}`
    t.equal(torrent.magnetURI, expectedMagnetURI)

    // `torrent.announce` must always be an array
    t.deepEqual(torrent.announce, ['http://tracker.local:80'])

    await client.remove(fixtures.leaves.parsedTorrent, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.add: parsed torrent, with array type announce property', t => {
  t.plan(7)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)
  parsedTorrent.announce = ['http://tracker.local:80', 'http://tracker.local:81']

  const torrent = client.add(parsedTorrent)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', async () => {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)

    const expectedMagnetURI = `${fixtures.leaves.magnetURI}&tr=${encodeURIComponent('http://tracker.local:80')}&tr=${encodeURIComponent('http://tracker.local:81')}`
    t.equal(torrent.magnetURI, expectedMagnetURI)

    t.deepEqual(torrent.announce, ['http://tracker.local:80', 'http://tracker.local:81'])

    await client.remove(fixtures.leaves.parsedTorrent, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.add: invalid torrent id: empty string', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => {
    t.ok(err instanceof Error)
    t.ok(err.message.includes('Invalid torrent identifier'))

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
  client.on('warning', err => { t.fail(err) })

  client.add('')
})

test('client.add: invalid torrent id: short buffer', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => {
    t.ok(err instanceof Error)
    t.ok(err.message.includes('Invalid torrent identifier'))

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
  client.on('warning', err => { t.fail(err) })

  client.add(Buffer.from('abc'))
})

test('client.add: paused torrent', t => {
  t.plan(5)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', (err) => { t.fail(err) })
  client.on('warning', (err) => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.magnetURI, { paused: true })
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', async () => {
    t.equal(torrent.paused, true)

    await client.remove(fixtures.leaves.magnetURI, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})
