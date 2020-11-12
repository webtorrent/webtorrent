const fixtures = require('webtorrent-fixtures')
const MemoryChunkStore = require('memory-chunk-store')
const test = require('tape')
const WebTorrent = require('../../')

test('Download using LSD (via magnet uri)', function (t) {
  t.plan(3)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: true })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: true })

  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  client2.on('error', function (err) { t.fail(err) })
  client2.on('warning', function (err) { t.fail(err) })

  // Start seeding
  client2.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, function (torrent) {
    torrent.discovery.lsd._announce() // hack to send a lsd announce skipping 5min interval
  })

  client2.on('listening', function () {
    // Start downloading
    const torrent = client1.add(fixtures.leaves.magnetURI, { store: MemoryChunkStore })

    torrent.on('done', function () {
      t.pass()

      client1.destroy(function (err) { t.error(err, 'client 1 destroyed') })
      client2.destroy(function (err) { t.error(err, 'client 2 destroyed') })
    })
  })
})
