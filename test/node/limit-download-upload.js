const fixtures = require('webtorrent-fixtures')
const test = require('tape')
const WebTorrent = require('../../')
const MemoryChunkStore = require('memory-chunk-store')

const DOWNLOAD_SPEED_LIMIT = 200000
const UPLOAD_SPEED_LIMIT = 200000

test('limit: limit download speed when tcp connection', function (t) {
  const client1 = new WebTorrent({ dht: false, tracker: false, downloadLimit: DOWNLOAD_SPEED_LIMIT })
  const client2 = new WebTorrent({ dht: false, tracker: false })

  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  client2.on('error', function (err) { t.fail(err) })
  client2.on('warning', function (err) { t.fail(err) })

  const downloadSpeeds = []

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  })

  client2.on('listening', function () {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    // Manually connect peers
    torrent.addPeer('127.0.0.1:' + client2.address().port)

    torrent.on('download', function (bytes) {
      downloadSpeeds.push(torrent.downloadSpeed)
    })

    torrent.on('done', function () {
      t.ok(downloadSpeeds.every(downloadSpeed => downloadSpeed < DOWNLOAD_SPEED_LIMIT))

      const min = Math.min.apply(this, downloadSpeeds)
      const avg = downloadSpeeds.reduce((acc, cur) => acc + cur, 0) / downloadSpeeds.length
      const max = Math.max.apply(this, downloadSpeeds)
      console.log(min, max, avg)

      client1.destroy()
      client2.destroy()
      t.end()
    })
  })
})

test('limit: limit upload speed when tcp connection', function (t) {
  const client1 = new WebTorrent({ dht: false, tracker: false })
  const client2 = new WebTorrent({ dht: false, tracker: false, uploadLimit: UPLOAD_SPEED_LIMIT })

  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  client2.on('error', function (err) { t.fail(err) })
  client2.on('warning', function (err) { t.fail(err) })

  const uploadSpeeds = []

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent => {
    torrent.on('upload', function (bytes) {
      uploadSpeeds.push(torrent.uploadSpeed)
    })
  })

  client2.on('listening', function () {
    // Start downloading
    const _torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    // Manually connect peers
    _torrent.addPeer('127.0.0.1:' + client2.address().port)

    _torrent.on('done', function () {
      t.ok(uploadSpeeds.every(uploadSpeed => uploadSpeed < UPLOAD_SPEED_LIMIT))

      const min = Math.min.apply(this, uploadSpeeds)
      const avg = uploadSpeeds.reduce((acc, cur) => acc + cur, 0) / uploadSpeeds.length
      const max = Math.max.apply(this, uploadSpeeds)
      console.log(min, max, avg)

      client1.destroy()
      client2.destroy()
      t.end()
    })
  })
})

test('limit: limit download speed when utp connection', function (t) {
  const client1 = new WebTorrent({ dht: false, tracker: false, utp: true, downloadLimit: DOWNLOAD_SPEED_LIMIT })
  const client2 = new WebTorrent({ dht: false, tracker: false, utp: true })

  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  client2.on('error', function (err) { t.fail(err) })
  client2.on('warning', function (err) { t.fail(err) })

  const downloadSpeeds = []

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  })

  client2.on('listening', function () {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    // Manually connect peers
    torrent.addPeer('127.0.0.1:' + client2.address().port)

    torrent.on('download', function (bytes) {
      downloadSpeeds.push(torrent.downloadSpeed)
    })

    torrent.on('done', function () {
      t.ok(downloadSpeeds.every(downloadSpeed => downloadSpeed < DOWNLOAD_SPEED_LIMIT))

      const min = Math.min.apply(this, downloadSpeeds)
      const avg = downloadSpeeds.reduce((acc, cur) => acc + cur, 0) / downloadSpeeds.length
      const max = Math.max.apply(this, downloadSpeeds)
      console.log(min, max, avg)

      client1.destroy()
      client2.destroy()
      t.end()
    })
  })
})

test('limit: limit upload speed when utp connection', function (t) {
  const client1 = new WebTorrent({ dht: false, tracker: false, utp: true })
  const client2 = new WebTorrent({ dht: false, tracker: false, utp: true, uploadLimit: UPLOAD_SPEED_LIMIT })

  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  client2.on('error', function (err) { t.fail(err) })
  client2.on('warning', function (err) { t.fail(err) })

  const uploadSpeeds = []

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent => {
    torrent.on('upload', function (bytes) {
      uploadSpeeds.push(torrent.uploadSpeed)
    })
  })

  client2.on('listening', function () {
    // Start downloading
    const _torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    // Manually connect peers
    _torrent.addPeer('127.0.0.1:' + client2.address().port)

    _torrent.on('done', function () {
      t.ok(uploadSpeeds.every(uploadSpeed => uploadSpeed < UPLOAD_SPEED_LIMIT))

      const min = Math.min.apply(this, uploadSpeeds)
      const avg = uploadSpeeds.reduce((acc, cur) => acc + cur, 0) / uploadSpeeds.length
      const max = Math.max.apply(this, uploadSpeeds)
      console.log(min, max, avg)

      client1.destroy()
      client2.destroy()
      t.end()
    })
  })
})

// TODO: test webRTC connections
