var Storage = require('../lib/storage')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var fs = require('fs')

var torrents = [ 'leaves', 'pride' ].map(function (name) {
  var torrent = fs.readFileSync(__dirname + '/torrents/' + name + '.torrent')

  return {
    name : name,
    torrent : torrent,
    parsedTorrent : parseTorrent(torrent)
  }
})

torrents.forEach(function (torrent) {
  test('sanity check backing storage for ' + torrent.name + ' torrent', function (t) {
    var parsedTorrent = torrent.parsedTorrent
    var storage = new Storage(parsedTorrent)

    t.equal(storage.files.length, parsedTorrent.files.length)
    t.equal(storage.pieces.length, parsedTorrent.pieces.length)

    var length = 0, pieces = 0

    storage.pieces.forEach(function (piece, index) {
      t.notOk(piece.verified)
      length += piece.length

      // ensure all blocks start out empty
      for (var i = 0; i < piece.blocks.length; ++i) {
        t.equal(piece.blocks[i], 0)
      }
    })

    t.equal(length, parsedTorrent.length)
    length = 0

    storage.files.forEach(function (file, index) {
      t.notOk(file.done)
      length += file.length
      pieces += file.pieces.length

      t.assert(file.length >= 0)
      t.assert(file.pieces.length >= 0)
    })

    t.equal(length, parsedTorrent.length)

    if (parsedTorrent.files.length > 1) {
      // if the torrent contains multiple files, the pieces may overlap file boundaries,
      // so the aggregate number of file pieces will be at least the number of pieces.
      t.assert(pieces >= parsedTorrent.pieces.length)
    } else {
      t.equal(pieces, parsedTorrent.pieces.length)
    }

    t.end()
  })
})
