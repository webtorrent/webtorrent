import DHT from 'bittorrent-dht/server'
import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import series from 'run-series'
import test from 'tape'
import WebTorrent from '../../index.js'

test('private torrent should not use DHT', function (t) {
  t.plan(4)

  const dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  let client

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      client = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port }
      })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      const torrent = client.add(fixtures.bunny.parsedTorrent, { store: MemoryChunkStore })

      torrent.on('dhtAnnounce', function () {
        t.fail('client announced to dht')
      })

      client.on('torrent', function () {
        if (!torrent.discovery.dht) {
          t.pass('dht is disabled for this torrent')
          cb(null)
        }
      })
    }
  ], function (err) {
    t.error(err)

    dhtServer.destroy(function (err) {
      t.error(err, 'dht server destroyed')
    })
    client.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
  })
})

test('public torrent should use DHT', function (t) {
  t.plan(4)

  const dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  let client

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      client = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port }
      })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      const torrent = client.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

      torrent.on('dhtAnnounce', function () {
        t.pass('client announced to dht')
        cb(null)
      })

      client.on('torrent', function () {
        if (!torrent.client.dht) {
          t.fail('dht server is null')
        }
      })
    }
  ], function (err) {
    t.error(err)

    dhtServer.destroy(function (err) {
      t.error(err, 'dht server destroyed')
    })
    client.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
  })
})

test('public torrent with forced private option should not use DHT', function (t) {
  t.plan(4)

  const dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  let client

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      client = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port }
      })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      const torrent = client.add(fixtures.leaves.parsedTorrent, {
        private: true,
        store: MemoryChunkStore
      })

      torrent.on('dhtAnnounce', function () {
        t.fail('client announced to dht')
      })

      client.on('torrent', function () {
        if (!torrent.discovery.dht) {
          t.pass('dht is disabled for this torrent')
          cb(null)
        }
      })
    }
  ], function (err) {
    t.error(err)

    dhtServer.destroy(function (err) {
      t.error(err, 'dht server destroyed')
    })
    client.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
  })
})

test('private torrent with forced public option should use DHT', function (t) {
  t.plan(4)

  const dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  let client

  series([
    function (cb) {
      dhtServer.listen(cb)
    },

    function (cb) {
      client = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: '127.0.0.1:' + dhtServer.address().port }
      })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      const torrent = client.add(fixtures.bunny.parsedTorrent, {
        private: false,
        store: MemoryChunkStore
      })

      torrent.on('dhtAnnounce', function () {
        t.pass('client announced to dht')
        cb(null)
      })

      client.on('torrent', function () {
        if (!torrent.client.dht) {
          t.fail('dht server is null')
        }
      })
    }
  ], function (err) {
    t.error(err)

    dhtServer.destroy(function (err) {
      t.error(err, 'dht server destroyed')
    })
    client.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
  })
})
