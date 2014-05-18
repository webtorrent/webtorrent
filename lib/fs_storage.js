module.exports = FSStorage

var Storage = require('bittorrent-client').Storage
var inherits = require('inherits')
var extend = require('extend.js')
var os = require('os')
var fs = require('fs')
var path = require('path')
var raf = require('random-access-file')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var thunky = require('thunky')

var TMP = fs.existsSync('/tmp') ? '/tmp' : os.tmpDir()

inherits(FSStorage, Storage)

/**
 * fs-backed Storage for a torrent download.
 *
 * @param {Object} parsedTorrent
 * @param {Object} opts
 */
function FSStorage (parsedTorrent, opts) {
  var self = this
  opts = extend({
    nobuffer: true,
    tmp: TMP,
    name: 'webtorrent'
  }, opts || {})
  Storage.call(self, parsedTorrent, opts)

  if (!opts.path) {
    opts.path = path.join(opts.tmp, opts.name, parsedTorrent.infoHash)
  }

  self.path = opts.path

  self.piecesMap = []
  self.files.forEach(function (file) {
    var fileStart   = file.offset
    var fileEnd     = fileStart + file.length

    var firstPiece  = file.pieces[0].index
    var lastPiece   = file.pieces[file.pieces.length - 1].index
    var pieceLength = file.pieceLength

    var open = thunky(function (cb) {
      var filePath = path.join(self.path, file.path)
      var fileDir  = path.dirname(filePath)

      mkdirp(fileDir, function (err) {
        if (err) return cb(err)
        if (self.closed) return cb(new Error('Storage closed'))

        var fd = raf(filePath)
        file.fd = fd
        cb(null, fd)
      })
    })

    file.pieces.forEach(function (piece) {
      var index = piece.index

      var pieceStart = index * pieceLength
      var pieceEnd   = pieceStart + piece.length

      var from   = (fileStart < pieceStart) ? 0 : fileStart - pieceStart
      var to     = (fileEnd > pieceEnd) ? pieceLength : fileEnd - pieceStart
      var offset = (fileStart > pieceStart) ? 0 : pieceStart - fileStart

      if (!self.piecesMap[index]) self.piecesMap[index] = []

      self.piecesMap[index].push({
        from: from,
        to: to,
        offset: offset,
        open: open
      })
    })
  })
}

FSStorage.prototype.readBlock = function (index, offset, length, cb) {
  var self = this
  if (!cb) return console.error('FSStorage.readBlock requires a callback')

  var piece = self.pieces[index]
  if (!piece) return cb(new Error('invalid piece index ' + index))

  if (piece.verified && piece.buffer) {
    // piece is verified and cached in memory, so read directly from its buffer
    // instead of reading from the filesystem.
    return piece.readBlock(offset, length, cb)
  }

  var rangeFrom = offset
  var rangeTo = rangeFrom + length

  var targets = self.piecesMap[index].filter(function (target) {
    return (target.to > rangeFrom && target.from < rangeTo)
  })

  if (!targets.length) return cb(new Error('no file matching the requested range?'))

  var buffers = []
  var end = targets.length
  var i = 0

  var readFromNextFile = function (err, buffer) {
    if (err) return cb(err)
    if (buffer) buffers.push(buffer)
    if (i >= end) return cb(null, Buffer.concat(buffers))

    var target = targets[i++]

    var from = target.from
    var to = target.to
    var offset = target.offset

    if (to > rangeTo) to = rangeTo
    if (from < rangeFrom) {
      offset += rangeFrom - from
      from = rangeFrom
    }

    target.open(function (err, file) {
      if (err) return cb(err)
      file.read(offset, to - from, readFromNextFile)
    })
  }

  readFromNextFile()
}

// flush pieces to file once they're done and verified
FSStorage.prototype._onPieceDone = function (piece) {
  var self = this
  var targets = self.piecesMap[piece.index]
  var end = targets.length
  var i = 0

  var writeToNextFile = function (err) {
    if (err) return self.emit('error', err)
    if (i >= end) {
      return Storage.prototype._onPieceDone.call(self, piece)
    }

    var target = targets[i++]
    target.open(function (err, file) {
      if (err) return self.emit('error', err)
      file.write(target.offset, piece.buffer.slice(target.from, target.to), writeToNextFile)
    })
  }

  writeToNextFile()
}

/**
 * Removes and cleans up any backing store for this storage.
 */
FSStorage.prototype.remove = function (cb) {
  var self = this
  if (!cb) cb = noop

  self.close(function (err) {
    if (err) return cb(err)
    var root = self.files[0].path.split(path.sep)[0]
    rimraf(path.join(self.path, root), cb)
  })
}

/**
 * Closes the backing store for this storage.
 */
FSStorage.prototype.close = function (cb) {
  var self = this
  if (!cb) cb = noop
  if (self.closed) return cb()

  Storage.prototype.close.call(self, function (err) {
    if (err) return cb(err)

    var i = 0
    function loop (err) {
      if (i >= self.files.length) return cb()
      if (err) return cb(err)
      var next = self.files[i++]
      if (!next || !next.fd) return process.nextTick(loop)
      next.fd.close(loop)
    }

    process.nextTick(loop)
  })
}
