var BitField = require('bitfield')
var EventEmitter = require('events').EventEmitter
var hat = require('hat')
var RarityMap = require('../lib/rarity-map')
var Swarm = require('bittorrent-swarm')
var test = require('tape')

var infoHash = 'd2474e86c95b19b8bcfdb92bc12c9d44667cfa36'
var peerId1 = '-WW0001-' + hat(48)

test('Rarity map usage', function (t) {
  t.plan(16)

  var swarm = new Swarm(infoHash, peerId1)
  var numPieces = 4
  swarm.wires = [ new EventEmitter(), new EventEmitter() ]
  swarm.wires.forEach(function (wire) {
    wire.peerPieces = new BitField(numPieces)
  })
  var rarityMap = new RarityMap(swarm, numPieces)

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

  // test initial / empty case
  validateInitial()

  rarityMap.recalculate()

  // test initial / empty case after recalc
  validateInitial()

  function setPiece (wire, index) {
    wire.peerPieces.set(index)
    wire.emit('have', index)
  }

  setPiece(swarm.wires[0], 0)
  setPiece(swarm.wires[1], 0)

  setPiece(swarm.wires[0], 1)
  setPiece(swarm.wires[1], 3)

  // test rarest piece after setting pieces and handling 'have' events
  var piece = rarityMap.getRarestPiece()
  t.equal(piece, 2)

  rarityMap.recalculate()

  // test rarest piece after recalc to ensure its the same
  piece = rarityMap.getRarestPiece()
  t.equal(piece, 2)

  function addWire () {
    var wire = new EventEmitter()
    wire.peerPieces = new BitField(numPieces)
    wire.peerPieces.set(1)
    wire.peerPieces.set(2)
    swarm.wires.push(wire)
    swarm.emit('wire', wire)
  }

  addWire()
  addWire()

  // test rarest piece after adding wires
  piece = rarityMap.getRarestPiece()
  t.equal(piece, 3)

  rarityMap.recalculate()

  // test rarest piece after adding wires and recalc
  piece = rarityMap.getRarestPiece()
  t.equal(piece, 3)

  function removeWire (index) {
    var wire = swarm.wires.splice(index, 1)[0]
    wire.emit('close')
  }

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
})
