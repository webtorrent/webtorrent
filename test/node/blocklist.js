import fs from 'fs'
import http from 'http'
import zlib from 'zlib'
import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../../index.js'

function assertBlocked (t, torrent, addr) {
  torrent.once('blockedPeer', _addr => {
    t.equal(addr, _addr)
  })
  t.notOk(torrent.addPeer(addr))
}

function assertReachable (t, torrent, addr) {
  torrent.once('peer', _addr => {
    t.equal(addr, _addr)
  })
  t.ok(torrent.addPeer(addr))
}

test('blocklist (single IP)', t => {
  t.plan(9)

  const client = new WebTorrent({
    dht: false,
    tracker: false,
    lsd: false,
    blocklist: ['1.2.3.4']
  })
  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  // blocklist isn't fully loaded until `ready` event
  client.on('ready', () => {
    client.add(fixtures.leaves.parsedTorrent, torrent => {
      assertBlocked(t, torrent, '1.2.3.4:1234')
      assertBlocked(t, torrent, '1.2.3.4:6969')
      assertReachable(t, torrent, '1.1.1.1:1234')
      assertReachable(t, torrent, '1.1.1.1:6969')

      client.destroy(err => {
        t.error(err, 'client destroyed')
      })
    })
  })
})

test('blocklist (array of IPs)', t => {
  t.plan(13)

  const client = new WebTorrent({
    dht: false,
    tracker: false,
    lsd: false,
    blocklist: ['1.2.3.4', '5.6.7.8']
  })
    .on('error', err => { t.fail(err) })
    .on('warning', err => { t.fail(err) })
    .on('ready', () => {
      client.add(fixtures.leaves.parsedTorrent, torrent => {
        assertBlocked(t, torrent, '1.2.3.4:1234')
        assertBlocked(t, torrent, '1.2.3.4:6969')
        assertBlocked(t, torrent, '5.6.7.8:1234')
        assertBlocked(t, torrent, '5.6.7.8:6969')
        assertReachable(t, torrent, '1.1.1.1:1234')
        assertReachable(t, torrent, '1.1.1.1:6969')

        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
})

// 48 asserts
function assertList (t, torrent) {
  assertBlocked(t, torrent, '1.2.3.0:1234')
  assertBlocked(t, torrent, '1.2.3.0:6969')

  assertBlocked(t, torrent, '1.2.3.1:1234')
  assertBlocked(t, torrent, '1.2.3.1:6969')

  assertBlocked(t, torrent, '1.2.3.1:1234')
  assertBlocked(t, torrent, '1.2.3.1:6969')

  assertBlocked(t, torrent, '1.2.3.254:1234')
  assertBlocked(t, torrent, '1.2.3.254:6969')

  assertBlocked(t, torrent, '1.2.3.255:1234')
  assertBlocked(t, torrent, '1.2.3.255:6969')

  assertBlocked(t, torrent, '5.6.7.0:1234')
  assertBlocked(t, torrent, '5.6.7.0:6969')

  assertBlocked(t, torrent, '5.6.7.128:1234')
  assertBlocked(t, torrent, '5.6.7.128:6969')

  assertBlocked(t, torrent, '5.6.7.255:1234')
  assertBlocked(t, torrent, '5.6.7.255:6969')

  assertReachable(t, torrent, '1.1.1.1:1234')
  assertReachable(t, torrent, '1.1.1.1:6969')

  assertReachable(t, torrent, '2.2.2.2:1234')
  assertReachable(t, torrent, '2.2.2.2:6969')

  assertReachable(t, torrent, '1.2.4.0:1234')
  assertReachable(t, torrent, '1.2.4.0:6969')

  assertReachable(t, torrent, '1.2.2.0:1234')
  assertReachable(t, torrent, '1.2.2.0:6969')
}

test('blocklist (array of IP ranges)', t => {
  t.plan(49)
  const client = new WebTorrent({
    dht: false,
    tracker: false,
    lsd: false,
    blocklist: [
      { start: '1.2.3.0', end: '1.2.3.255' },
      { start: '5.6.7.0', end: '5.6.7.255' }
    ]
  })
    .on('error', err => { t.fail(err) })
    .on('warning', err => { t.fail(err) })
    .on('ready', () => {
      client.add(fixtures.leaves.parsedTorrent, torrent => {
        assertList(t, torrent)
        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
})

test('blocklist (http url)', t => {
  t.plan(51)
  const server = http.createServer((req, res) => {
    // Check that WebTorrent declares a user agent
    t.ok(req.headers['user-agent'].includes('WebTorrent'))

    fs.createReadStream(fixtures.blocklist.path).pipe(res)
  })

  server.listen(0, () => {
    const port = server.address().port
    const url = `http://127.0.0.1:${port}`
    const client = new WebTorrent({
      dht: false,
      tracker: false,
      lsd: false,
      blocklist: url
    })
      .on('error', err => { t.fail(err) })
      .on('warning', err => { t.fail(err) })
      .on('ready', () => {
        client.add(fixtures.leaves.parsedTorrent, torrent => {
          assertList(t, torrent)
          client.destroy(err => {
            t.error(err, 'client destroyed')
          })
          server.close(() => {
            t.pass('server closed')
          })
        })
      })
  })
})

test('blocklist (http url with gzip encoding)', t => {
  t.plan(51)
  const server = http.createServer((req, res) => {
    // Check that WebTorrent declares a user agent
    t.ok(req.headers['user-agent'].includes('WebTorrent'))

    res.setHeader('content-encoding', 'gzip')
    fs.createReadStream(fixtures.blocklist.path)
      .pipe(zlib.createGzip())
      .pipe(res)
  })

  server.listen(0, () => {
    const port = server.address().port
    const url = `http://127.0.0.1:${port}`
    const client = new WebTorrent({
      dht: false,
      tracker: false,
      lsd: false,
      blocklist: url
    })
      .on('error', err => { t.fail(err) })
      .on('warning', err => { t.fail(err) })
      .on('ready', () => {
        client.add(fixtures.leaves.parsedTorrent, torrent => {
          assertList(t, torrent)
          client.destroy(err => {
            t.error(err, 'client destroyed')
          })
          server.close(() => {
            t.pass('server closed')
          })
        })
      })
  })
})

test('blocklist (http url with deflate encoding)', t => {
  t.plan(51)
  const server = http.createServer((req, res) => {
    // Check that WebTorrent declares a user agent
    t.ok(req.headers['user-agent'].includes('WebTorrent'))

    res.setHeader('content-encoding', 'deflate')
    fs.createReadStream(fixtures.blocklist.path)
      .pipe(zlib.createDeflate())
      .pipe(res)
  })

  server.listen(0, () => {
    const port = server.address().port
    const url = `http://127.0.0.1:${port}`
    const client = new WebTorrent({
      dht: false,
      tracker: false,
      lsd: false,
      blocklist: url
    })
      .on('error', err => { t.fail(err) })
      .on('warning', err => { t.fail(err) })
      .on('ready', () => {
        client.add(fixtures.leaves.parsedTorrent, torrent => {
          assertList(t, torrent)
          client.destroy(err => {
            t.error(err, 'client destroyed')
          })
          server.close(() => {
            t.pass('server closed')
          })
        })
      })
  })
})

test('blocklist (fs path)', t => {
  t.plan(49)
  const client = new WebTorrent({
    dht: false,
    tracker: false,
    lsd: false,
    blocklist: fixtures.blocklist.path
  })
    .on('error', err => { t.fail(err) })
    .on('warning', err => { t.fail(err) })
    .on('ready', () => {
      client.add(fixtures.leaves.parsedTorrent, torrent => {
        assertList(t, torrent)
        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
})

test('blocklist (fs path with gzip)', t => {
  t.plan(49)
  const client = new WebTorrent({
    dht: false,
    tracker: false,
    lsd: false,
    blocklist: fixtures.blocklist.gzipPath
  })
    .on('error', err => { t.fail(err) })
    .on('warning', err => { t.fail(err) })
    .on('ready', () => {
      client.add(fixtures.leaves.parsedTorrent, torrent => {
        assertList(t, torrent)
        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
})
