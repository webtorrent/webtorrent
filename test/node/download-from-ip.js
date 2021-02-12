const fixtures = require('webtorrent-fixtures')
const fs = require('fs')
const MemoryChunkStore = require('memory-chunk-store')
const test = require('tape')
const WebTorrent = require('../../')

test('Download via torrent.addPeer()', (t) => {
  t.plan(7)
  // if initial interest isn't set, then this test is delayed
  t.timeoutAfter(5000)

  const seeder = new WebTorrent({ tracker: false, dht: false, lsd: false })

  seeder.on('error', (err) => t.fail(err))
  seeder.on('warning', (err) => t.fail(err))

  const torrent = seeder.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

  torrent.on('ready', function () {
    // torrent metadata has been fetched -- sanity check it
    t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

    const names = ['Leaves of Grass by Walt Whitman.epub']
    t.deepEqual(torrent.files.map(function (file) { return file.name }), names)
  })

  torrent.load(fs.createReadStream(fixtures.leaves.contentPath), (err) => {
    t.error(err)

    // torrent data now loaded into seeder

    const downloader = new WebTorrent({ tracker: false, dht: false, lsd: false })

    downloader.on('error', function (err) { t.fail(err) })
    downloader.on('warning', function (err) { t.fail(err) })

    downloader.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore }, (torrent) => {
      torrent.addPeer(`localhost:${seeder.torrentPort}`)

      torrent.once('done', function () {
        torrent.files.forEach((file) => {
          file.getBuffer((err, buf) => {
            t.error(err)

            t.deepEqual(buf, fixtures.leaves.content, 'downloaded correct content')

            seeder.destroy((err) => t.error(err, 'seeder destroyed'))
            downloader.destroy((err) => t.error(err, 'downloader destroyed'))
          })
        })
      })
    })
  })
})

test('Download via magnet x.pe (BEP09)', (t) => {
  t.plan(7)
  // if initial interest isn't set, then this test is delayed
  t.timeoutAfter(5000)

  const seeder = new WebTorrent({ tracker: false, dht: false, lsd: false, torrentPort: 63000 })

  seeder.on('error', (err) => t.fail(err))
  seeder.on('warning', (err) => t.fail(err))

  const torrent = seeder.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

  torrent.on('ready', function () {
    // torrent metadata has been fetched -- sanity check it
    t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

    const names = ['Leaves of Grass by Walt Whitman.epub']
    t.deepEqual(torrent.files.map(function (file) { return file.name }), names)
  })

  torrent.load(fs.createReadStream(fixtures.leaves.contentPath), (err) => {
    t.error(err)

    // torrent data now loaded into seeder

    const downloader = new WebTorrent({ tracker: false, dht: false, lsd: false })

    downloader.on('error', function (err) { t.fail(err) })
    downloader.on('warning', function (err) { t.fail(err) })

    // add x.pe to the magnet
    const peerAddress = '127.0.0.1:63000'
    const magnetURI = fixtures.leaves.magnetURI + `&x.pe=${peerAddress}`

    downloader.add(magnetURI, { store: MemoryChunkStore }, (torrent) => {
      torrent.once('done', function () {
        torrent.files.forEach((file) => {
          file.getBuffer((err, buf) => {
            t.error(err)

            t.deepEqual(buf, fixtures.leaves.content, 'downloaded correct content')

            seeder.destroy((err) => t.error(err, 'seeder destroyed'))
            downloader.destroy((err) => t.error(err, 'downloader destroyed'))
          })
        })
      })
    })
  })
})
