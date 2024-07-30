import fs from 'fs'
import { Server as DHT } from 'bittorrent-dht'
import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import networkAddress from 'network-address'
import series from 'run-series'
import test from 'tape'
import WebTorrent from '../../index.js'

test('Download using DHT (via magnet uri)', t => {
  t.plan(11)

  const dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', err => { t.fail(err) })
  dhtServer.on('warning', err => { t.fail(err) })

  let client1, client2

  series([
    cb => {
      dhtServer.listen(cb)
    },

    cb => {
      let announced = false
      let loaded = false

      client1 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: `127.0.0.1:${dhtServer.address().port}`, host: networkAddress.ipv4() }
      })

      client1.dht.on('listening', () => {
        t.equal(client1.dhtPort, client1.dht.address().port)
      })

      client1.on('error', err => { t.fail(err) })
      client1.on('warning', err => { t.fail(err) })

      const torrent = client1.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

      torrent.on('dhtAnnounce', () => {
        t.pass('finished dht announce')
        announced = true
        maybeDone()
      })

      torrent.on('ready', () => {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        const names = ['Leaves of Grass by Walt Whitman.epub']
        t.deepEqual(torrent.files.map(file => file.name), names)
      })

      torrent.load(fs.createReadStream(fixtures.leaves.contentPath), err => {
        t.error(err)
        loaded = true
        maybeDone()
      })

      function maybeDone () {
        if (announced && loaded) cb(null)
      }
    },

    cb => {
      let gotBuffer = false
      let gotDone = false

      client2 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: `127.0.0.1:${dhtServer.address().port}`, host: networkAddress.ipv4() }
      })

      client2.on('error', err => { t.fail(err) })
      client2.on('warning', err => { t.fail(err) })

      client2.on('torrent', async torrent => {
        torrent.once('done', () => {
          t.pass('client2 downloaded torrent from client1')

          gotDone = true
          maybeDone()
        })

        try {
          const ab = await torrent.files[0].arrayBuffer()
          t.deepEqual(new Uint8Array(ab), new Uint8Array(fixtures.leaves.content), 'downloaded correct content')
        } catch (err) {
          t.error(err)
        }

        gotBuffer = true
        maybeDone()
      })

      client2.add(fixtures.leaves.magnetURI, { store: MemoryChunkStore })

      function maybeDone () {
        if (gotBuffer && gotDone) cb(null)
      }
    }
  ], err => {
    t.error(err)

    client1.destroy(err => {
      t.error(err, 'client1 destroyed')
    })
    client2.destroy(err => {
      t.error(err, 'client2 destroyed')
    })
    dhtServer.destroy(err => {
      t.error(err, 'dht server destroyed')
    })
  })
})
