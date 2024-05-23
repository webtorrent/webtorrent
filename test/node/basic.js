import fs from 'fs'
import path from 'path'
import http from 'http'
import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../../index.js'

test('WebTorrent.WEBRTC_SUPPORT', t => {
  t.plan(2)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  t.equal(WebTorrent.WEBRTC_SUPPORT, true)

  client.destroy(err => {
    t.error(err, 'client destroyed')
  })
})

test('client.add: http url to a torrent file, string', t => {
  t.plan(8)

  const server = http.createServer((req, res) => {
    t.ok(req.headers['user-agent'].includes('WebTorrent'))
    res.end(fixtures.leaves.torrent)
  })

  server.listen(0, () => {
    const port = server.address().port
    const url = `http://127.0.0.1:${port}`
    const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

    client.on('error', err => { t.fail(err) })
    client.on('warning', err => { t.fail(err) })

    client.add(url, async torrent => {
      t.equal(client.torrents.length, 1)
      t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
      t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

      await client.remove(torrent, err => { t.error(err, 'torrent destroyed') })
      t.equal(client.torrents.length, 0)

      server.close(() => { t.pass('http server closed') })
      client.destroy(err => { t.error(err, 'client destroyed') })
    })
  })
})

test('client.add: filesystem path to a torrent file, string', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.add(fixtures.leaves.torrentPath, async torrent => {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    await client.remove(torrent, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.seed: filesystem path to file, string', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.leaves.contentPath, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, async torrent => {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.leaves.magnetURI)

    await client.remove(torrent, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.seed: filesystem path to folder with one file, string', t => {
  t.plan(6)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.folder.contentPath, { announce: [] }, async torrent => {
    t.equal(client.torrents.length, 1)
    t.equal(torrent.infoHash, fixtures.folder.parsedTorrent.infoHash)
    t.equal(torrent.magnetURI, fixtures.folder.magnetURI)

    await client.remove(torrent, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.seed: filesystem path to folder with multiple files, string', t => {
  t.plan(7)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.numbers.contentPath, { announce: [] }, async torrent => {
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

    await client.remove(torrent, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('client.add: invalid torrent id: invalid filesystem path', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => {
    t.ok(err instanceof Error)
    t.ok(err.message.includes('Invalid torrent identifier'))

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
  client.on('warning', err => { t.fail(err) })

  client.add('/invalid/filesystem/path/123')
})

test('client.remove: opts.destroyStore', t => {
  t.plan(2)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.alice.content, { name: 'alice.txt', announce: [] }, torrent => {
    const torrentPath = torrent.path
    client.remove(torrent, { destroyStore: true }, err => {
      if (err) t.fail(err)

      fs.stat(path.join(torrentPath, 'alice.txt'), err => {
        if (err && err.code === 'ENOENT') t.pass('file deleted')
        else t.fail('file still exists')

        client.destroy(err => { t.error(err, 'client destroyed') })
      })
    })
  })
})

test('torrent.destroy: opts.destroyStore', t => {
  t.plan(2)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.seed(fixtures.alice.content, { name: 'alice.txt', announce: [] }, torrent => {
    const torrentPath = torrent.path
    torrent.destroy({ destroyStore: true }, err => {
      if (err) t.fail(err)

      fs.stat(path.join(torrentPath, 'alice.txt'), err => {
        if (err && err.code === 'ENOENT') t.pass('file deleted')
        else t.fail('file still exists')

        client.destroy(err => { t.error(err, 'client destroyed') })
      })
    })
  })
})
