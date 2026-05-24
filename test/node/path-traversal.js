import fs from 'fs'
import os from 'os'
import path from 'path'
import test from 'tape'
import WebTorrent from '../../index.js'

test('torrent.getFileModtimes rejects traversal paths outside the download root', t => {
  t.plan(4)

  const downloadRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'webtorrent-path-traversal-'))
  const traversalTarget = '../../../etc/hosts'

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', err => {
    t.fail(err)
  })

  client.on('warning', err => {
    t.fail(err)
  })

  const torrent = client.add({
    infoHash: '0123456789012345678901234567890123456789',
    info: Buffer.from('path-traversal-demo'),
    name: 'malicious_torrent',
    announce: [],
    urlList: [],
    pieceLength: 16384,
    lastPieceLength: 16,
    pieces: [Buffer.alloc(20)],
    length: 16,
    files: [{
      name: 'hosts',
      path: traversalTarget,
      length: 16,
      offset: 0
    }]
  }, {
    path: downloadRoot,
    skipVerify: true
  })

  torrent.once('ready', () => {
    torrent.getFileModtimes((err, modtimes) => {
      t.ok(err instanceof Error)
      t.equal(err.message, 'invalid file path')
      t.deepEqual(modtimes, [])

      client.destroy(destroyErr => {
        t.error(destroyErr, 'client destroyed')
        fs.rmSync(downloadRoot, { recursive: true, force: true })
      })
    })
  })

  torrent.once('error', err => {
    t.fail(err)
    client.destroy(() => {
      fs.rmSync(downloadRoot, { recursive: true, force: true })
    })
  })
})
