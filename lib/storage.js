module.exports = Storage

var BitField = require('bitfield')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var Rusha = require('rusha-browserify') // Fast SHA1 (works in browser)

var BLOCK_LENGTH = 16 * 1024
var BLOCK_BLANK = 0
var BLOCK_RESERVED = 1
var BLOCK_WRITTEN = 2

inherits(Piece, EventEmitter)

/**
 * Piece
 * -----
 * A piece within a torrent
 *
 * @param {number} index  piece index
 * @param {string} hash   sha1 hash (hex) for this piece
 * @param {Buffer} buffer backing buffer for this piece
 */
function Piece (index, hash, buffer) {
  var self = this
  if (!(self instanceof Piece)) return new Piece(index, hash, buffer)
  EventEmitter.call(self)

  self.index = index
  self.hash = hash
  self.buffer = buffer

  self.length = buffer.length
  self._reset()
}

Piece.prototype.readBlock = function (offset, length) {
  var self = this
  if (!self._verifyOffset(offset)) return
  return self.buffer.slice(offset, offset + length)
}

Piece.prototype.writeBlock = function (offset, buffer) {
  var self = this
  if (!self._verifyOffset(offset)) return
  if (!self._verifyBlock(offset, buffer)) return

  var i = offset / BLOCK_LENGTH
  if (self.blocks[i] === BLOCK_WRITTEN) return

  buffer.copy(self.buffer, offset)
  self.blocks[i] = BLOCK_WRITTEN
  self.blocksWritten += 1

  if (self.blocksWritten === self.blocks.length)
    self._verify()
}

Piece.prototype.selectBlock = function (endGame) {
  var self = this
  var len = self.blocks.length
  for (var i = 0; i < len; i++) {
    if ((self.blocks[i] && !endGame) || self.blocks[i] === BLOCK_WRITTEN) continue
    self.blocks[i] = BLOCK_RESERVED
    return {
      offset: i * BLOCK_LENGTH,
      length: (i === len - 1)
        ? self.length - (i * BLOCK_LENGTH)
        : BLOCK_LENGTH
    }
  }
  return null
}

Piece.prototype.deselectBlock = function (offset) {
  var self = this
  if (!self._verifyOffset(offset)) return

  var i = offset / BLOCK_LENGTH
  if (self.blocks[i] === BLOCK_RESERVED)
    self.blocks[i] = BLOCK_BLANK
}

Piece.prototype._reset = function () {
  var self = this
  self.verified = false
  self.blocks = new Buffer(Math.ceil(self.length / BLOCK_LENGTH))
  self.blocksWritten = 0
}

Piece.prototype._verify = function () {
  var self = this
  if (self.verified) return

  self.verified = (sha1(self.buffer) === self.hash)
  if (self.verified)
    self.emit('done')
  else {
    console.error('piece', self.index, 'failed verification', sha1(self.buffer), 'expected', self.hash)
    self._reset()
  }
}

Piece.prototype._verifyOffset = function (offset) {
  if (offset % BLOCK_LENGTH === 0) {
    return true
  } else {
    console.error('invalid offset', offset, 'not multiple of', BLOCK_LENGTH, 'bytes')
    return false
  }
}

Piece.prototype._verifyBlock = function (offset, buffer) {
  var self = this
  if ((self.length - offset) < BLOCK_LENGTH || buffer.length === BLOCK_LENGTH) {
    return true
  } else {
    console.error('invalid block of size', buffer.length, 'bytes')
    return false
  }
}

inherits(File, EventEmitter)

/**
 * File
 * ----
 * A file within a torrent
 *
 * @param {Object} file           the file object from the parsed torrent
 * @param {Buffer} buffer         backing buffer for this file
 * @param {Array.<Piece>} pieces  backing pieces for this file
 */
function File (file, buffer, pieces) {
  var self = this
  if (!(self instanceof File)) return new File(file, buffer, pieces)
  EventEmitter.call(self)

  self.name = file.name
  self.path = file.path
  self.length = file.length
  self.offset = file.offset
  self.buffer = buffer
  self.pieces = pieces

  self.done = false

  self.pieces.forEach(function (piece) {
    piece.on('done', function () {
      self._checkDone()
    })
  })
}

File.prototype._checkDone = function () {
  var self = this
  self.done = self.pieces.every(function (piece) {
    return piece.done
  })
  if (self.done)
    self.emit('done')
}

inherits(Storage, EventEmitter)

/**
 * Storage
 * -------
 * Storage for a torrent download
 *
 * @param {[type]} parsedTorrent [description]
 */
function Storage (parsedTorrent) {
  var self = this
  if (!(self instanceof Storage)) return new Storage(parsedTorrent)
  EventEmitter.call(self)

  self.parsedTorrent = parsedTorrent
  self.pieceLength = parsedTorrent.pieceLength

  self.buffer = new Buffer(self.parsedTorrent.length)
  self.bitfield = new BitField(self.parsedTorrent.pieces.length)

  self.pieces = self.parsedTorrent.pieces.map(function (hash, index) {
    var start = index * self.pieceLength
    var end = start + self.pieceLength
    var buffer = self.buffer.slice(start, end) // references same memory

    var piece = new Piece(index, hash, buffer)
    piece.on('done', self._onPieceDone.bind(self, piece))
    return piece
  })

  self.files = self.parsedTorrent.files.map(function (fileObj) {
    var start = fileObj.offset
    var end = start + fileObj.length
    var buffer = self.buffer.slice(start, end) // references same memory

    var startPiece = start / self.pieceLength | 0
    var endPiece = (end - 1) / self.pieceLength | 0
    var pieces = self.pieces.slice(startPiece, endPiece + 1)

    var file = new File(fileObj, buffer, pieces)
    file.on('done', self._onFileDone.bind(self, file))
    return file
  })
}

/**
 * Percentage complete, represented as a number between 0 and 1.
 */
Object.defineProperty(Storage.prototype, 'progress', {
  get: function () {
    var self = this
    return (self.pieces.length - self.numMissing) / self.pieces.length
  }
})

// Currently unused. Use to implement "end game" mode.
Object.defineProperty(Storage.prototype, 'numMissing', {
  get: function () {
    var self = this
    var numMissing = 0
    for (var index = 0, len = self.pieces.length; index < len; index++) {
      numMissing += self.bitfield.get(index)
    }
    return numMissing
  }
})

Storage.prototype.readBlock = function (index, offset, length) {
  var self = this
  var piece = self.pieces[index]
  if (!piece) return null
  return piece.readBlock(offset, length)
}

Storage.prototype.writeBlock = function (index, offset, buffer) {
  var self = this
  var piece = self.pieces[index]
  if (!piece) return
  piece.writeBlock(offset, buffer)
}

Storage.prototype.selectBlock = function (index, endGame) {
  var self = this
  var piece = self.pieces[index]
  if (!piece) return null
  return piece.selectBlock(endGame)
}

Storage.prototype.deselectBlock = function (index, offset) {
  var self = this
  var piece = self.pieces[index]
  if (!piece) return
  piece.deselectBlock(offset)
}

//
// HELPER METHODS
//

Storage.prototype._onPieceDone = function (piece) {
  var self = this
  self.bitfield.set(piece.index)
  self.emit('piece', piece)
}

Storage.prototype._onFileDone = function (file) {
  var self = this
  self.emit('file', file)
}

function sha1 (buf) {
  return (new Rusha()).digestFromBuffer(buf)
}
