var extend = require('xtend')
var fixtures = require('webtorrent-fixtures')
var hat = require('hat')
var test = require('tape')
var Torrent = require('../lib/torrent')
var Wire = require('bittorrent-protocol')

test('Rarity map usage', function (t) {
  t.plan(16)

  var numPieces = 4
  var torrentId = extend(fixtures.numbers.parsedTorrent, {
    pieces: Array(numPieces)
  })
  var client = {
    listening: true,
    peerId: hat(160),
    torrentPort: 6889,
    dht: false,
    tracker: false,
    _remove: function () {}
  }
  var opts = {}
  var torrent = new Torrent(torrentId, client, opts)
  torrent.on('metadata', function () {
    torrent._onWire(new Wire())
    torrent._onWire(new Wire())

    var rarityMap = torrent._rarityMap

    // test initial / empty case
    validateInitial()

    rarityMap.recalculate()

    // test initial / empty case after recalc
    validateInitial()

    setPiece(torrent.wires[0], 0)
    setPiece(torrent.wires[1], 0)

    setPiece(torrent.wires[0], 1)
    setPiece(torrent.wires[1], 3)

    // test rarest piece after setting pieces and handling 'have' events
    var piece = rarityMap.getRarestPiece()
    t.equal(piece, 2)

    rarityMap.recalculate()

    // test rarest piece after recalc to ensure its the same
    piece = rarityMap.getRarestPiece()
    t.equal(piece, 2)

    addWire()
    addWire()

    // test rarest piece after adding wires
    piece = rarityMap.getRarestPiece()
    t.equal(piece, 3)

    rarityMap.recalculate()

    // test rarest piece after adding wires and recalc
    piece = rarityMap.getRarestPiece()
    t.equal(piece, 3)

    removeWire(3)
    removeWire(1)

    // test rarest piece after removing wires
    piece = rarityMap.getRarestPiece()
    t.equal(piece, 3)

    rarityMap.recalculate()

    // test rarest piece after removing wires and recalc
    piece = rarityMap.getRarestPiece()
    t.equal(piece, 3)

    // test piece filter func
    piece = rarityMap.getRarestPiece(function (i) { return i <= 1 })
    t.equal(piece, 0)

    piece = rarityMap.getRarestPiece(function (i) { return i === 1 || i === 2 })
    t.equal(piece, 2)

    function validateInitial () {
      // note that getRarestPiece will return a random piece since they're all equal
      // so repeat the test several times to reasonably ensure its correctness.
      var piece = rarityMap.getRarestPiece()
      t.ok(piece >= 0 && piece < numPieces)

      piece = rarityMap.getRarestPiece()
      t.ok(piece >= 0 && piece < numPieces)

      piece = rarityMap.getRarestPiece()
      t.ok(piece >= 0 && piece < numPieces)

      piece = rarityMap.getRarestPiece()
      t.ok(piece >= 0 && piece < numPieces)
    }

    function setPiece (wire, index) {
      wire.peerPieces.set(index)
      wire.emit('have', index)
    }

    function addWire () {
      var wire = new Wire()
      wire.peerPieces.set(1)
      wire.peerPieces.set(2)
      torrent._onWire(wire)
    }

    function removeWire (index) {
      var wire = torrent.wires.splice(index, 1)[0]
      wire.destroy()
    }
  })

  t.on('end', function () {
    torrent.wires.forEach(function (wire) {
      wire.destroy()
    })
    torrent.destroy()
  })
})
