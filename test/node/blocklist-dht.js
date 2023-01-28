import { Server as DHT } from 'bittorrent-dht'
import fixtures from 'webtorrent-fixtures'
import series from 'run-series'
import test from 'tape'
import WebTorrent from '../../index.js'
import common from '../common.js'

test('blocklist blocks peers discovered via DHT', t => {
  t.plan(8)

  let dhtServer, client1, client2

  series([
    cb => {
      dhtServer = new DHT({ bootstrap: false })
      dhtServer.on('error', err => { t.fail(err) })
      dhtServer.on('warning', err => { t.fail(err) })
      dhtServer.listen(cb)
    },

    cb => {
      let torrentReady = false
      let announced = false

      client1 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: `127.0.0.1:${dhtServer.address().port}` }
      })
      client1.on('error', err => { t.fail(err) })
      client1.on('warning', err => { t.fail(err) })

      const torrent1 = client1.add(fixtures.leaves.parsedTorrent, {
        path: common.getDownloadPath('client_1', fixtures.leaves.parsedTorrent.infoHash)
      })

      torrent1.on('peer', () => {
        t.fail('client1 should not find any peers')
      })

      torrent1.on('blockedPeer', () => {
        t.fail('client1 should not block any peers')
      })

      torrent1.on('ready', () => {
        t.pass('torrent1 ready')
        torrentReady = true
        maybeDone()
      })

      torrent1.on('dhtAnnounce', () => {
        t.pass('client1 announced to dht')
        announced = true
        maybeDone()
      })

      function maybeDone () {
        if (torrentReady && announced) cb(null)
      }
    },

    cb => {
      client2 = new WebTorrent({
        tracker: false,
        lsd: false,
        dht: { bootstrap: `127.0.0.1:${dhtServer.address().port}` },
        blocklist: ['127.0.0.1']
      })
      client2.on('error', err => { t.fail(err) })
      client2.on('warning', err => { t.fail(err) })

      const torrent2 = client2.add(fixtures.leaves.parsedTorrent, {
        path: common.getDownloadPath('client_2', fixtures.leaves.parsedTorrent.infoHash)
      })

      torrent2.on('blockedPeer', addr => {
        t.pass(`client2 blocked connection to client1: ${addr}`)
        blockedPeer = true
        maybeDone()
      })

      torrent2.on('dhtAnnounce', () => {
        t.pass('client2 announced to dht')
        announced = true
        maybeDone()
      })

      torrent2.on('peer', addr => {
        t.fail('client2 should not find any peers')
      })

      let blockedPeer, announced
      function maybeDone () {
        if (blockedPeer && announced) cb(null)
      }
    }

  ], err => {
    t.error(err)
    dhtServer.destroy(err => {
      t.error(err, 'dht server destroyed')
    })
    client1.destroy(err => {
      t.error(err, 'client1 destroyed')
    })
    client2.destroy(err => {
      t.error(err, 'client2 destroyed')
    })
  })
})
