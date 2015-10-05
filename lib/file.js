module.exports = File

var appendTo = require('./append-to')
var eos = require('end-of-stream')
var EventEmitter = require('events').EventEmitter
var FileStream = require('./file-stream')
var inherits = require('inherits')
var mime = require('./mime.json')
var path = require('path')
var stream = require('stream')

inherits(File, EventEmitter)

/**
 * @param {Torrent} torrent torrent that the file belongs to
 * @param {Object} file file object from the parsed torrent
 */
function File (torrent, file) {
  EventEmitter.call(this)

  this._torrent = torrent

  this.name = file.name
  this.path = file.path
  this.length = file.length
  this.offset = file.offset

  this.done = false

  var start = file.offset
  var end = start + file.length - 1

  this._startPiece = start / this._torrent.pieceLength | 0
  this._endPiece = end / this._torrent.pieceLength | 0

  if (this.length === 0) {
    this.done = true
    this.emit('done')
  }
}

/**
 * Selects the file to be downloaded, but at a lower priority than files with streams.
 * Useful if you know you need the file at a later stage.
 */
File.prototype.select = function () {
  if (this.length === 0) return
  this._torrent.select(this._startPiece, this._endPiece, false)
}

/**
 * Deselects the file, which means it won't be downloaded unless someone creates a stream
 * for it.
 */
File.prototype.deselect = function () {
  if (this.length === 0) return
  this._torrent.deselect(this._startPiece, this._endPiece, false)
}

/**
 * Create a readable stream to the file. Pieces needed by the stream will be prioritized
 * highly and fetched from the swarm first.
 *
 * @param {Object} opts
 * @param {number} opts.start stream slice of file, starting from this byte (inclusive)
 * @param {number} opts.end   stream slice of file, ending with this byte (inclusive)
 * @return {FileStream}
 */
File.prototype.createReadStream = function (opts) {
  var self = this
  if (this.length === 0) {
    var empty = new stream.PassThrough()
    process.nextTick(function () {
      empty.end()
    })
    return empty
  }

  var fileStream = new FileStream(self, opts)
  self._torrent.select(fileStream._startPiece, fileStream._endPiece, true, function () {
    fileStream._notify()
  })
  eos(fileStream, function () {
    self._torrent.deselect(fileStream._startPiece, fileStream._endPiece, true)
  })
  return fileStream
}

/**
 * @param {function} cb
 */
File.prototype.getBuffer = function (cb) {
  var buf = new Buffer(this.length)
  var offset = 0
  this.createReadStream()
    .on('data', function (chunk) {
      chunk.copy(buf, offset)
      offset += chunk.length
    })
    .on('end', function () {
      cb(null, buf)
    })
    .on('error', cb)
}

/**
 * @param {function} cb
 */
File.prototype.getBlobURL = function (cb) {
  var self = this
  if (typeof window === 'undefined') throw new Error('browser-only method')

  self.getBuffer(function (err, buffer) {
    if (err) return cb(err)
    var ext = path.extname(self.name).toLowerCase()
    var type = mime[ext]
    var blob = type ? new window.Blob([ buffer ], { type: type }) : new window.Blob([ buffer ])
    var url = window.URL.createObjectURL(blob)
    cb(null, url)
  })
}

/**
 * Show the file in a the browser by appending it to the DOM.
 * @param {Element|string} elem
 * @param {function} cb
 */
File.prototype.appendTo = function (elem, cb) {
  if (typeof window === 'undefined') throw new Error('browser-only method')
  if (typeof elem === 'string') elem = document.querySelector(elem)
  appendTo(this, elem, cb)
}
