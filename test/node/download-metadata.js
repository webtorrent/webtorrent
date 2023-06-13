import http from 'http'
import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import test from 'tape'
import WebTorrent from '../../index.js'

function createServer (data, cb) {
  const server = http.createServer((req, res) => {
    if (req.url !== '/') {
      res.statusCode = 404
      res.end()
    } else {
      res.end(data)
    }
  })

  server.on('listening', () => {
    const address = server.address()
    const url = `http://127.0.0.1:${address.port}/`
    cb(url, server)
  })

  server.listen()
}

test('Download metadata for magnet URI with xs parameter', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  createServer(fixtures.leaves.torrent, (url, server) => {
    const encodedUrl = encodeURIComponent(url)
    client.add(`${fixtures.leaves.magnetURI}&xs=${encodedUrl}`, { store: MemoryChunkStore }, torrent => {
      t.equal(torrent.files[0].name, 'Leaves of Grass by Walt Whitman.epub')
      client.destroy(err => { t.error(err, 'client destroyed') })
      server.close(() => { t.pass('server closed') })
    })
  })
})

test('Download metadata for magnet URI with 2 xs parameters', t => {
  t.plan(4)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  createServer(fixtures.leaves.torrent, (url1, server1) => {
    const encodedUrl1 = encodeURIComponent(url1)

    createServer(fixtures.leaves.torrent, (url2, server2) => {
      const encodedUrl2 = encodeURIComponent(url2)

      const uri = `${fixtures.leaves.magnetURI}&xs=${encodedUrl1}&xs=${encodedUrl2}`

      client.add(uri, { store: MemoryChunkStore }, torrent => {
        t.equal(torrent.files[0].name, 'Leaves of Grass by Walt Whitman.epub')
        client.destroy(err => { t.error(err, 'client destroyed') })
        server1.close(() => { t.pass('server closed') })
        server2.close(() => { t.pass('server closed') })
      })
    })
  })
})

test('Download metadata for magnet URI with 2 xs parameters, with 1 invalid protocol', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  createServer(fixtures.leaves.torrent, (url, server) => {
    const encodedUrl1 = encodeURIComponent('invalidurl:example')
    const encodedUrl2 = encodeURIComponent(url)
    const uri = `${fixtures.leaves.magnetURI}&xs=${encodedUrl1}&xs=${encodedUrl2}`

    client.add(uri, { store: MemoryChunkStore }, torrent => {
      t.equal(torrent.files[0].name, 'Leaves of Grass by Walt Whitman.epub')
      client.destroy(err => { t.error(err, 'client destroyed') })
      server.close(() => { t.pass('server closed') })
    })
  })
})

test('Download metadata for magnet URI with 2 xs parameters, with 1 404 URL', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  createServer(fixtures.leaves.torrent, (url, server) => {
    const encodedUrl1 = encodeURIComponent(`${url}blah_404`)
    const encodedUrl2 = encodeURIComponent(url)
    const uri = `${fixtures.leaves.magnetURI}&xs=${encodedUrl1}&xs=${encodedUrl2}`

    client.add(uri, { store: MemoryChunkStore }, torrent => {
      t.equal(torrent.files[0].name, 'Leaves of Grass by Walt Whitman.epub')
      client.destroy(err => { t.error(err, 'client destroyed') })
      server.close(() => { t.pass('server closed') })
    })
  })
})

test('Download metadata magnet URI with unsupported protocol in xs parameter', t => {
  t.plan(1)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.add(`${fixtures.leaves.magnetURI}&xs=${encodeURIComponent('invalidurl:example')}`, { store: MemoryChunkStore })

  setTimeout(() => {
    // no crash by now
    client.destroy(err => { t.error(err, 'client destroyed') })
  }, 100)
})
