import fs from 'fs'
import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import test from 'tape'
import WebTorrent from '../../index.js'

test('Download via torrent.addPeer()', (t) => {
  t.plan(6)
  // if initial interest isn't set, then this test is delayed
  t.timeoutAfter(5000)

  const seeder = new WebTorrent({ tracker: false, dht: false, lsd: false })

  seeder.on('error', (err) => t.fail(err))
  seeder.on('warning', (err) => t.fail(err))

  const torrent = seeder.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

  torrent.on('ready', () => {
    // torrent metadata has been fetched -- sanity check it
    t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

    const names = ['Leaves of Grass by Walt Whitman.epub']
    t.deepEqual(torrent.files.map(file => file.name), names)
  })

  torrent.load(fs.createReadStream(fixtures.leaves.contentPath), (err) => {
    t.error(err)

    // torrent data now loaded into seeder

    const downloader = new WebTorrent({ tracker: false, dht: false, lsd: false })

    downloader.on('error', err => { t.fail(err) })
    downloader.on('warning', err => { t.fail(err) })

    downloader.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore }, (torrent) => {
      torrent.addPeer(`localhost:${seeder.torrentPort}`)

      torrent.once('done', async () => {
        for (const file of torrent.files) {
          try {
            const ab = await file.arrayBuffer()
            t.deepEqual(new Uint8Array(ab), new Uint8Array(fixtures.leaves.content), 'downloaded correct content')
          } catch (err) {
            t.error(err)
          }
          seeder.destroy((err) => t.error(err, 'seeder destroyed'))
          downloader.destroy((err) => t.error(err, 'downloader destroyed'))
        }
      })
    })
  })
})

test('Download via magnet x.pe (BEP09)', (t) => {
  t.plan(6)
  // if initial interest isn't set, then this test is delayed
  t.timeoutAfter(5000)

  const seeder = new WebTorrent({ tracker: false, dht: false, lsd: false, torrentPort: 63000 })

  seeder.on('error', (err) => t.fail(err))
  seeder.on('warning', (err) => t.fail(err))

  const torrent = seeder.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

  torrent.on('ready', () => {
    // torrent metadata has been fetched -- sanity check it
    t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

    const names = ['Leaves of Grass by Walt Whitman.epub']
    t.deepEqual(torrent.files.map(file => file.name), names)
  })

  torrent.load(fs.createReadStream(fixtures.leaves.contentPath), (err) => {
    t.error(err)

    // torrent data now loaded into seeder

    const downloader = new WebTorrent({ tracker: false, dht: false, lsd: false })

    downloader.on('error', err => { t.fail(err) })
    downloader.on('warning', err => { t.fail(err) })

    // add x.pe to the magnet
    const peerAddress = '127.0.0.1:63000'
    const magnetURI = fixtures.leaves.magnetURI + `&x.pe=${peerAddress}`

    downloader.add(magnetURI, { store: MemoryChunkStore }, (torrent) => {
      torrent.once('done', async () => {
        for (const file of torrent.files) {
          try {
            const ab = await file.arrayBuffer()
            t.deepEqual(new Uint8Array(ab), new Uint8Array(fixtures.leaves.content), 'downloaded correct content')
          } catch (err) {
            t.error(err)
          }

          seeder.destroy((err) => t.error(err, 'seeder destroyed'))
          downloader.destroy((err) => t.error(err, 'downloader destroyed'))
        }
      })
    })
  })
})
