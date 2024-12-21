import test from 'tape'
import WebTorrent from '../../index.js'
import MemoryChunkStore from 'memory-chunk-store'

test('protocol encryption: secure option does not stall downloads', t => {
  t.plan(6)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, secure: true })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, secure: true })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  // Start seeding
  client2.seed(Buffer.from('Hello World'), {
    name: 'Hello.txt',
    announce: []
  })

  client2.on('listening', () => {
    // Start downloading
    const torrent = client1.add(client2.torrents[0].infoHash, { store: MemoryChunkStore })

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
