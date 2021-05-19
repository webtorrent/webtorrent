const fixtures = require('webtorrent-fixtures')
const test = require('tape')
const WebTorrent = require('../../')
const MemoryChunkStore = require('memory-chunk-store')

const DOWNLOAD_SPEED_LIMIT = 200 * 1000 // 200 KB/s
const UPLOAD_SPEED_LIMIT = 200 * 1000 // 200 KB/s

function testSpeed (t, downloaderOpts, uploaderOpts, cb) {
  const client1 = new WebTorrent({ dht: false, tracker: false, ...downloaderOpts })
  const client2 = new WebTorrent({ dht: false, tracker: false, ...uploaderOpts })

  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  client2.on('error', function (err) { t.fail(err) })
  client2.on('warning', function (err) { t.fail(err) })

  const downloadSpeeds = []
  const uploadSpeeds = []

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, torrent => {
    torrent.on('upload', function () {
      uploadSpeeds.push(torrent.uploadSpeed)
    })
  })


  client2.on('listening', function () {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

    // Manually connect peers
    torrent.addPeer('127.0.0.1:' + client2.address().port)

    torrent.on('download', function () {
      downloadSpeeds.push(torrent.downloadSpeed)
    })

    torrent.on('done', function () {
      cb(downloadSpeeds, uploadSpeeds)

      client1.destroy(function (err) { t.error(err, 'client 1 destroyed') })
      client2.destroy(function (err) { t.error(err, 'client 2 destroyed') })
    })
  })
}

test('Limit download speed by constructor when tcp connection', function (t) {
  t.plan(3)

  testSpeed(t, { downloadLimit: DOWNLOAD_SPEED_LIMIT }, {}, function (downloadSpeeds) {
      t.ok(downloadSpeeds.every(downloadSpeed => downloadSpeed <= DOWNLOAD_SPEED_LIMIT))
  })
})

test('Limit upload speed by constructor when tcp connection', function (t) {
  t.plan(3)

  testSpeed(t, {}, { uploadLimit: UPLOAD_SPEED_LIMIT }, function (_, uploadSpeeds) {
      t.ok(uploadSpeeds.every(uploadSpeed => uploadSpeed <= UPLOAD_SPEED_LIMIT))
  })
})

test('Limit download speed by constructor when utp connection', function (t) {
  t.plan(3)

  testSpeed(t, { utp: true, downloadLimit: DOWNLOAD_SPEED_LIMIT }, { utp: true }, function (downloadSpeeds) {
      t.ok(downloadSpeeds.every(downloadSpeed => downloadSpeed <= DOWNLOAD_SPEED_LIMIT))
  })
})

test('Limit upload speed by constructor when utp connection', function (t) {
  t.plan(3)

  testSpeed(t, { utp: true }, { utp: true, uploadLimit: UPLOAD_SPEED_LIMIT }, function (_, uploadSpeeds) {
      t.ok(uploadSpeeds.every(uploadSpeed => uploadSpeed <= UPLOAD_SPEED_LIMIT))
  })
})
