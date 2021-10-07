/* global Blob */

const fixtures = require('webtorrent-fixtures')
const test = require('tape')
const WebTorrent = require('../index.js')

test('client.seed: torrent file (Buffer)', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent => {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    client.remove(torrent, err => { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.seed: torrent file (Buffer), set name on buffer', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const buf = Buffer.from(fixtures.leaves.content)
  buf.name = 'Leaves of Grass by Walt Whitman.epub'

  client.seed(buf, { announce: [] }, torrent => {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    client.remove(torrent, err => { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.seed: torrent file (Blob)', t => {
  if (typeof Blob === 'undefined') return t.end()

  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(new Blob([fixtures.leaves.content]), {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent => {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    client.remove(torrent, err => { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})
