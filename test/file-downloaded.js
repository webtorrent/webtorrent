import test from 'tape'
import File from '../lib/file.js'

test('file downloaded never goes negative in a shared partial piece', t => {
  const pieceLength = 16384
  const piece = { missing: pieceLength - 1024 }
  const torrent = {
    pieceLength,
    lastPieceLength: pieceLength,
    pieces: [piece],
    bitfield: { get: () => false }
  }
  const file = new File(torrent, { name: 'fixture.bin', path: 'fixture.bin', offset: 4096, length: 1024 })

  t.equal(file.downloaded, 0, 'does not subtract more than the piece has downloaded')
  t.equal(file.progress, 0, 'progress stays within its documented range')

  piece.missing = 512
  t.equal(file.downloaded, 512, 'counts the bytes remaining after both trims')
  t.equal(file.progress, 0.5, 'reports partial progress when some bytes are known present')
  t.end()
})
