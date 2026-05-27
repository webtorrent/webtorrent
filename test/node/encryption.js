import fs from 'fs'
import test from 'tape'
import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import WebTorrent from '../../index.js'

const leavesContentPath = fixtures.leaves.contentPath

function createClient (opts = {}) {
  return new WebTorrent({
    dht: false,
    tracker: false,
    lsd: false,
    utp: false,
    ...opts
  })
}

function runTransferTest (t, seederLevel, downloaderLevel, expectedMethod) {
  const seeder = createClient({ secure: seederLevel })
  const downloader = createClient({ secure: downloaderLevel })

  seeder.on('error', err => { t.fail(err) })
  seeder.on('warning', err => { t.fail(err) })
  downloader.on('error', err => { t.fail(err) })
  downloader.on('warning', err => { t.fail(err) })

  const torrent1 = seeder.add(fixtures.leaves.parsedTorrent, { store: MemoryChunkStore })

  torrent1.on('ready', () => {
    torrent1.load(fs.createReadStream(leavesContentPath), err => {
      t.error(err, 'seeder loaded content')

      const torrent2 = downloader.add(fixtures.leaves.parsedTorrent.infoHash, { store: MemoryChunkStore })

      torrent2.on('infoHash', () => {
        torrent2.addPeer(`127.0.0.1:${seeder.torrentPort}`)
      })

      let wiresChecked = 0
      torrent2.on('wire', wire => {
        wiresChecked++
        if (expectedMethod != null) {
          t.ok(wire._cryptoHandshakeDone, 'crypto handshake completed on wire ' + wiresChecked)
          t.equal(wire._encryptionMethod, expectedMethod, 'wire ' + wiresChecked + ' uses encryption method ' + expectedMethod)
        }
      })

      torrent2.on('done', () => {
        t.pass('download completed (seeder=' + seederLevel + ', downloader=' + downloaderLevel + ')')
        downloader.destroy(() => seeder.destroy())
      })
    })
  })
}

test('PE/MSE: no encryption with secure: 0+0', t => {
  t.plan(2)
  runTransferTest(t, 0, 0, null)
})

test('PE/MSE: encrypted transfer with secure: 2+2', t => {
  t.plan(4)
  runTransferTest(t, 2, 2, 2)
})

test('PE/MSE: encrypted transfer with secure: 1+1 (prefer plaintext)', t => {
  t.plan(4)
  runTransferTest(t, 1, 1, 1)
})

test('PE/MSE: encrypted seeder=2 accepts plain downloader=0', t => {
  t.plan(2)
  runTransferTest(t, 2, 0, null)
})

test('PE/MSE: encrypted seeder=1 accepts plain downloader=0', t => {
  t.plan(2)
  runTransferTest(t, 1, 0, null)
})

test('PE/MSE: mixed secure: 1+2 (initiator offers both, responder RC4)', t => {
  t.plan(4)
  runTransferTest(t, 2, 1, 2)
})

test('PE/MSE: mixed secure: 2+1 (initiator RC4 only, responder accepts RC4)', t => {
  t.plan(4)
  runTransferTest(t, 1, 2, 2)
})
