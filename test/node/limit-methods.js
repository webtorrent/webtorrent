import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import MemoryChunkStore from 'memory-chunk-store'
import WebTorrent from '../../index.js'

const DOWNLOAD_SPEED_LIMIT = 200 * 1000 // 200 KB/s
const UPLOAD_SPEED_LIMIT = 200 * 1000 // 200 KB/s

function testSpeed (t, downloaderOpts, uploaderOpts, cb) {
  const { downloadLimit, ...restDownloaderOpts } = downloaderOpts
  const { uploadLimit, ...restUploaderOpts } = uploaderOpts

  const client1 = new WebTorrent({ dht: false, tracker: false, ...restDownloaderOpts })
  const client2 = new WebTorrent({ dht: false, tracker: false, ...restUploaderOpts })

  if (downloadLimit) client1.throttleDownload(downloadLimit)
  if (uploadLimit) client2.throttleUpload(uploadLimit)

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

test('Limit download speed by methods when tcp connection', t => {
  t.plan(3)

  testSpeed(t, { downloadLimit: DOWNLOAD_SPEED_LIMIT }, {}, downloadSpeeds => {
    t.ok(downloadSpeeds.every(downloadSpeed => downloadSpeed <= DOWNLOAD_SPEED_LIMIT))
  })
})

test('Limit upload speed by methods when tcp connection', t => {
  t.plan(3)

  testSpeed(t, {}, { uploadLimit: UPLOAD_SPEED_LIMIT }, (_, uploadSpeeds) => {
    t.ok(uploadSpeeds.every(uploadSpeed => uploadSpeed <= UPLOAD_SPEED_LIMIT))
  })
})

test('Limit download speed by methods when utp connection', t => {
  t.plan(3)

  testSpeed(t, { utp: true, downloadLimit: DOWNLOAD_SPEED_LIMIT }, { utp: true }, downloadSpeeds => {
    t.ok(downloadSpeeds.every(downloadSpeed => downloadSpeed <= DOWNLOAD_SPEED_LIMIT))
  })
})

test('Limit upload speed by methods when utp connection', t => {
  t.plan(3)

  testSpeed(t, { utp: true }, { utp: true, uploadLimit: UPLOAD_SPEED_LIMIT }, (_, uploadSpeeds) => {
    t.ok(uploadSpeeds.every(uploadSpeed => uploadSpeed <= UPLOAD_SPEED_LIMIT))
  })
})
