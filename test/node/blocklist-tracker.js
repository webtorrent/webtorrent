import fixtures from 'webtorrent-fixtures'
import series from 'run-series'
import test from 'tape'
import { Server as TrackerServer } from 'bittorrent-tracker'
import WebTorrent from '../../index.js'
import common from '../common.js'

test('blocklist blocks peers discovered via tracker', t => {
  t.plan(9)

  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)
  let tracker, client1, client2

  series([
    cb => {
      tracker = new TrackerServer({ udp: false, ws: false })

      tracker.listen(() => {
        const port = tracker.http.address().port
        const announceUrl = `http://127.0.0.1:${port}/announce`

        // Overwrite announce with our local tracker
        parsedTorrent.announce = announceUrl

        cb(null)
      })

      tracker.once('start', () => {
        t.pass('client1 connected to tracker')

        tracker.once('start', () => {
          t.pass('client2 connected to tracker')
        })
      })
    },

    cb => {
      client1 = new WebTorrent({ dht: false, lsd: false })
      client1.on('error', err => { t.fail(err) })
      client1.on('warning', err => { t.fail(err) })

      const torrent1 = client1.add(parsedTorrent, {
        path: common.getDownloadPath('client_1', parsedTorrent.infoHash)
      })

      torrent1.once('invalidPeer', () => {
        t.pass('client1 found itself')
        cb(null)
      })

      torrent1.on('blockedPeer', () => {
        t.fail('client1 should not block any peers')
      })
    },

    cb => {
      client2 = new WebTorrent({
        dht: false,
        lsd: false,
        blocklist: ['127.0.0.1']
      })
      client2.on('error', err => { t.fail(err) })
      client2.on('warning', err => { t.fail(err) })

      const torrent2 = client2.add(parsedTorrent, {
        path: common.getDownloadPath('client_2', parsedTorrent.infoHash)
      })

      torrent2.once('blockedPeer', () => {
        t.pass('client2 blocked first peer')

        torrent2.once('blockedPeer', () => {
          t.pass('client2 blocked second peer')
          cb(null)
        })
      })

      torrent2.on('peer', () => {
        t.fail('client2 should not find any peers')
      })
    }

  ], err => {
    t.error(err)
    tracker.close(() => {
      t.pass('tracker closed')
    })
    client1.destroy(err => {
      t.error(err, 'client1 destroyed')
    })
    client2.destroy(err => {
      t.error(err, 'client2 destroyed')
    })
  })
})
