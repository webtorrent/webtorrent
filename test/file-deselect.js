import File from '../lib/file.js'
import { Selections } from '../lib/selections.js'
import test from 'tape'

// Builds a minimal torrent stub that records selections the same way
// Torrent#select / Torrent#deselect do.
function makeTorrent (pieceLength, fileDescriptors) {
  const selections = new Selections()
  const torrent = {
    pieceLength,
    files: [],
    selections,
    select (start, end, priority) {
      selections.insert({ from: start, to: end, offset: 0, priority: priority || 0 })
    },
    deselect (start, end) {
      selections.remove({ from: start, to: end })
    }
  }
  torrent.files = fileDescriptors.map(descriptor => new File(torrent, descriptor))
  return torrent
}

function isSelected (torrent, piece) {
  for (const selection of torrent.selections._items) {
    if (selection.from <= piece && selection.to >= piece) return true
  }
  return false
}

test('file.deselect: keeps a boundary piece shared with a selected file', function (t) {
  // pieceLength 100, so the .mp4 covers pieces 0-10 and the .srt starts on piece 10
  const torrent = makeTorrent(100, [
    { name: 'video.mp4', path: 'video.mp4', length: 1051, offset: 0 },
    { name: 'video.srt', path: 'video.srt', length: 50, offset: 1051 }
  ])
  const [mp4, srt] = torrent.files

  t.equal(mp4._endPiece, srt._startPiece, 'files share a piece boundary')

  mp4.select()
  srt.select()
  srt.deselect()

  t.ok(isSelected(torrent, mp4._endPiece), 'shared piece is still selected for the .mp4')
  t.notOk(isSelected(torrent, srt._endPiece), 'unshared piece of the .srt is deselected')
  t.end()
})

test('file.deselect: still deselects a boundary piece once the neighbour is deselected', function (t) {
  const torrent = makeTorrent(100, [
    { name: 'video.mp4', path: 'video.mp4', length: 1051, offset: 0 },
    { name: 'video.srt', path: 'video.srt', length: 50, offset: 1051 }
  ])
  const [mp4, srt] = torrent.files

  mp4.select()
  srt.select()
  srt.deselect()
  mp4.deselect()

  t.notOk(isSelected(torrent, mp4._endPiece), 'shared piece is released once neither file wants it')
  t.equal(torrent.selections.length, 0, 'no selections remain')
  t.end()
})

test('file.deselect: deselects the whole range when no piece is shared', function (t) {
  // Both files are piece aligned, so nothing overlaps
  const torrent = makeTorrent(100, [
    { name: 'a.bin', path: 'a.bin', length: 1000, offset: 0 },
    { name: 'b.bin', path: 'b.bin', length: 1000, offset: 1000 }
  ])
  const [a, b] = torrent.files

  a.select()
  b.select()
  b.deselect()

  for (let piece = a._startPiece; piece <= a._endPiece; piece++) {
    t.ok(isSelected(torrent, piece), `piece ${piece} of the first file is still selected`)
  }
  for (let piece = b._startPiece; piece <= b._endPiece; piece++) {
    t.notOk(isSelected(torrent, piece), `piece ${piece} of the second file is deselected`)
  }
  t.end()
})

test('file.deselect: a re-selected neighbour protects the shared piece again', function (t) {
  const torrent = makeTorrent(100, [
    { name: 'video.mp4', path: 'video.mp4', length: 1051, offset: 0 },
    { name: 'video.srt', path: 'video.srt', length: 50, offset: 1051 }
  ])
  const [mp4, srt] = torrent.files

  mp4.select()
  srt.select()
  mp4.deselect()
  mp4.select()
  srt.deselect()

  t.ok(isSelected(torrent, mp4._endPiece), 'shared piece survives the second deselect')
  t.end()
})
