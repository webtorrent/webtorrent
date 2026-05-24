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

test('PE/MSE: encrypted transfer with secure:true', t => {
  t.plan(4)

  const seeder = createClient({ secure: true })
  const downloader = createClient({ secure: true })

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
        t.ok(wire._cryptoHandshakeDone, 'crypto handshake completed on wire ' + wiresChecked)
        t.equal(wire._encryptionMethod, 2, 'wire ' + wiresChecked + ' uses RC4 encryption')
      })

      torrent2.on('done', () => {
        t.pass('download completed over encrypted connection')
        downloader.destroy(() => seeder.destroy())
      })
    })
  })
})

test('PE/MSE: no encryption with secure:false', t => {
  t.plan(2)

  const seeder = createClient({ secure: false })
  const downloader = createClient({ secure: false })

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

      torrent2.on('done', () => {
        t.pass('download completed without encryption')
        downloader.destroy(() => seeder.destroy())
      })
    })
  })
})

test('PE/MSE: encrypted seeder accepts plain downloader', t => {
  t.plan(2)

  const seeder = createClient({ secure: true })
  const downloader = createClient({ secure: false })

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

      torrent2.on('done', () => {
        t.pass('download completed (seeder encrypted accepts plain downloader)')
        downloader.destroy(() => seeder.destroy())
      })
    })
  })
})
