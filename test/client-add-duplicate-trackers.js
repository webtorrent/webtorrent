import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../index.js'

test('client.add: duplicate trackers', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.torrent, {
    announce: ['wss://example.com', 'wss://example.com', 'wss://example.com']
  })

  torrent.on('ready', () => {
    t.equal(torrent.magnetURI, `${fixtures.leaves.magnetURI}&tr=${encodeURIComponent('wss://example.com')}`)
    client.remove(fixtures.leaves.magnetURI, err => { t.error(err, 'torrent destroyed') })
    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.add: duplicate trackers, with multiple torrents', t => {
  t.plan(5)

  // Re-use this object, in case webtorrent is changing it
  const opts = {
    announce: ['wss://example.com', 'wss://example.com', 'wss://example.com']
  }

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent1 = client.add(fixtures.leaves.torrent, opts)

  torrent1.on('ready', () => {
    t.equal(torrent1.magnetURI, `${fixtures.leaves.magnetURI}&tr=${encodeURIComponent('wss://example.com')}`)

    const torrent2 = client.add(fixtures.alice.torrent, opts)

    torrent2.on('ready', () => {
      t.equal(torrent2.magnetURI, `${fixtures.alice.magnetURI}&tr=${encodeURIComponent('wss://example.com')}`)

      torrent1.destroy(err => { t.error(err, 'torrent1 destroyed') })
      torrent2.destroy(err => { t.error(err, 'torrent2 destroyed') })
      client.destroy(err => { t.error(err, 'client destroyed') })
    })
  })
})

test('client.add: duplicate trackers (including in .torrent file), multiple torrents', t => {
  t.plan(5)

  // Re-use this object, in case webtorrent is changing it
  const opts = {
    announce: ['wss://example.com', 'wss://example.com', 'wss://example.com']
  }

  // Include the duplicate trackers in the .torrent files
  const parsedTorrentLeaves = Object.assign({}, fixtures.leaves.parsedTorrent)
  parsedTorrentLeaves.announce = ['wss://example.com', 'wss://example.com', 'wss://example.com']

  const parsedTorrentAlice = Object.assign({}, fixtures.alice.parsedTorrent)
  parsedTorrentAlice.announce = ['wss://example.com', 'wss://example.com', 'wss://example.com']

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent1 = client.add(parsedTorrentLeaves, opts)

  torrent1.on('ready', () => {
    t.equal(torrent1.magnetURI, `${fixtures.leaves.magnetURI}&tr=${encodeURIComponent('wss://example.com')}`)

    const torrent2 = client.add(parsedTorrentAlice, opts)

    torrent2.on('ready', () => {
      t.equal(torrent2.magnetURI, `${fixtures.alice.magnetURI}&tr=${encodeURIComponent('wss://example.com')}`)

      torrent1.destroy(err => { t.error(err, 'torrent1 destroyed') })
      torrent2.destroy(err => { t.error(err, 'torrent2 destroyed') })
      client.destroy(err => { t.error(err, 'client destroyed') })
    })
  })
})
