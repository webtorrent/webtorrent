const fixtures = require('webtorrent-fixtures')
const fs = require('fs')
const path = require('path')
const http = require('http')
const test = require('tape')
const WebTorrent = require('../../')

test('WebTorrent.WEBRTC_SUPPORT', function (t) {
  t.plan(2)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  t.equal(WebTorrent.WEBRTC_SUPPORT, false)

  client.destroy(function (err) {
    t.error(err, 'client destroyed')
  })
})

test('client.add: http url to a torrent file, string', function (t) {
  t.plan(8)

  const server = http.createServer(function (req, res) {
    t.ok(req.headers['user-agent'].indexOf('WebTorrent') !== -1)
    res.end(fixtures.leaves.torrent)
  })

  server.listen(0, function () {
    const port = server.address().port
    const url = 'http://127.0.0.1:' + port
    const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    client.add(url, function (torrent) {
      t.equal(client.torrents.length, 1)
      t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
      t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

      client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
      t.equal(client.torrents.length, 0)

      server.close(function () { t.pass('http server closed') })
      client.destroy(function (err) { t.error(err, 'client destroyed') })
    })
  })
})

test('client.add: filesystem path to a torrent file, string', function (t) {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.add(fixtures.leaves.torrentPath, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.seed: filesystem path to file, string', function (t) {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(fixtures.leaves.contentPath, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.seed: filesystem path to folder with one file, string', function (t) {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(fixtures.folder.contentPath, { announce: [] }, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.folder.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.folder.magnetURI)

    client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.seed: filesystem path to folder with multiple files, string', function (t) {
  t.plan(7)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(fixtures.numbers.contentPath, { announce: [] }, function (torrent) {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.numbers.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.numbers.magnetURI)

    const downloaded = torrent.files.map(file => ({
      length: file.length,
      downloaded: file.downloaded
    }))

    t.deepEqual(downloaded, [
      { length: 1, downloaded: 1 },
      { length: 2, downloaded: 2 },
      { length: 3, downloaded: 3 }
    ], 'expected downloaded to be calculated correctly')

    client.remove(torrent, function (err) { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})

test('client.add: invalid torrent id: invalid filesystem path', function (t) {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) {
    t.ok(err instanceof Error)
    t.ok(err.message.indexOf('Invalid torrent identifier') >= 0)

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
  client.on('warning', function (err) { t.fail(err) })

  client.add('/invalid/filesystem/path/123')
})

test('client.remove: opts.destroyStore', function (t) {
  t.plan(2)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(fixtures.alice.content, { name: 'alice.txt', announce: [] }, function (torrent) {
    const torrentPath = torrent.path
    client.remove(torrent, { destroyStore: true }, function (err) {
      if (err) t.fail(err)

      fs.stat(path.join(torrentPath, 'alice.txt'), function (err) {
        if (err && err.code === 'ENOENT') t.pass('file deleted')
        else t.fail('file still exists')

        client.destroy(function (err) { t.error(err, 'client destroyed') })
      })
    })
  })
})

test('torrent.destroy: opts.destroyStore', function (t) {
  t.plan(2)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(fixtures.alice.content, { name: 'alice.txt', announce: [] }, function (torrent) {
    const torrentPath = torrent.path
    torrent.destroy({ destroyStore: true }, function (err) {
      if (err) t.fail(err)

      fs.stat(path.join(torrentPath, 'alice.txt'), function (err) {
        if (err && err.code === 'ENOENT') t.pass('file deleted')
        else t.fail('file still exists')

        client.destroy(function (err) { t.error(err, 'client destroyed') })
      })
    })
  })
})
