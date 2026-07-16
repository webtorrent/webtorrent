import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import MemoryChunkStore from 'memory-chunk-store'
import WebTorrent from '../../index.js'

const UPLOAD_SPEED_LIMIT = 200 * 1000 // 200 KB/s

function testSpeed (t, downloaderOpts, uploaderOpts, cb) {
  const client1 = new WebTorrent({ dht: false, tracker: false, ...downloaderOpts })
  const client2 = new WebTorrent({ dht: false, tracker: false, ...uploaderOpts })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  const downloadSpeeds = []
  const uploadSpeeds = []

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent => {
    torrent.on('upload', () => {
      uploadSpeeds.push(torrent.uploadSpeed)
    })
  })

  client2.on('listening', () => {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    torrent.once('infoHash', () => {
      // Manually connect peers
      torrent.addPeer(`127.0.0.1:${client2.address().port}`)
    })

    torrent.on('download', () => {
      downloadSpeeds.push(torrent.downloadSpeed)
    })

    torrent.on('done', () => {
      cb(downloadSpeeds, uploadSpeeds)

      client1.destroy(err => { t.error(err, 'client 1 destroyed') })
      client2.destroy(err => { t.error(err, 'client 2 destroyed') })
    })
  })
}

test('Limit per-torrent upload speed by client constructor option when tcp connection', t => {
  t.plan(3)

  testSpeed(t, {}, { torrentUploadLimit: UPLOAD_SPEED_LIMIT }, (_, uploadSpeeds) => {
    t.ok(uploadSpeeds.every(uploadSpeed => uploadSpeed <= UPLOAD_SPEED_LIMIT))
  })
})

test('Limit per-torrent upload speed by client throttleTorrentUpload method when tcp connection', t => {
  t.plan(3)

  const client1 = new WebTorrent({ dht: false, tracker: false })
  const client2 = new WebTorrent({ dht: false, tracker: false })
  client2.throttleTorrentUpload(UPLOAD_SPEED_LIMIT)

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  const uploadSpeeds = []

  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent => {
    torrent.on('upload', () => {
      uploadSpeeds.push(torrent.uploadSpeed)
    })
  })

  client2.on('listening', () => {
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    torrent.once('infoHash', () => {
      torrent.addPeer(`127.0.0.1:${client2.address().port}`)
    })

    torrent.on('done', () => {
      t.ok(uploadSpeeds.every(uploadSpeed => uploadSpeed <= UPLOAD_SPEED_LIMIT))

      client1.destroy(err => { t.error(err, 'client 1 destroyed') })
      client2.destroy(err => { t.error(err, 'client 2 destroyed') })
    })
  })
})

test('Limit per-torrent upload speed by torrent throttleUploadSpeed method when tcp connection', t => {
  t.plan(3)

  const client1 = new WebTorrent({ dht: false, tracker: false })
  const client2 = new WebTorrent({ dht: false, tracker: false })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  const uploadSpeeds = []

  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent => {
    torrent.throttleUploadSpeed(UPLOAD_SPEED_LIMIT)
    torrent.on('upload', () => {
      uploadSpeeds.push(torrent.uploadSpeed)
    })
  })

  client2.on('listening', () => {
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    torrent.once('infoHash', () => {
      torrent.addPeer(`127.0.0.1:${client2.address().port}`)
    })

    torrent.on('done', () => {
      t.ok(uploadSpeeds.every(uploadSpeed => uploadSpeed <= UPLOAD_SPEED_LIMIT))

      client1.destroy(err => { t.error(err, 'client 1 destroyed') })
      client2.destroy(err => { t.error(err, 'client 2 destroyed') })
    })
  })
})
