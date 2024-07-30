import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import FileIterator from '../lib/file-iterator.js'
import WebTorrent from '../index.js'

test('file iterator: use chunk store iterator if done', t => {
  t.plan(8)

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

    const iterator = torrent.files[0][Symbol.asyncIterator]()
    t.ok(torrent.files[0].done, 'file finished downloading')
    t.ok(!(iterator instanceof FileIterator), 'iterator isn\'t FileIterator')
    iterator.return()

    await client.remove(torrent, err => { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('file iterator: use file iterator if not done', t => {
  t.plan(8)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.torrent)
  t.equal(client.torrents.length, 1)

  torrent.on('ready', async () => {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    t.ok(!torrent.files[0].done, 'file hasn\'t finished downloading')
    const iterator = torrent.files[0][Symbol.asyncIterator]()
    t.ok(iterator instanceof FileIterator, 'iterator is FileIterator')
    iterator.return()

    await client.remove(fixtures.leaves.torrent, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})
