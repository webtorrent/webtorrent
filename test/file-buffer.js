import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../index.js'

test('file buffer: use chunk store iterator if done', t => {
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

    const buffer = await torrent.files[0].arrayBuffer({ start: 0, end: 99 }) // 100 bytes, node streams are end-inclusive
    t.ok(buffer.byteLength === 100, 'buffer is 100 bytes')
    const orig = fixtures.leaves.content.buffer.slice(0, 100) // 100 bytes, buffers are end-exclusive
    t.deepEqual(new Uint8Array(orig), new Uint8Array(buffer), 'buffer from torrent file matches original')

    await client.remove(torrent, err => { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})
