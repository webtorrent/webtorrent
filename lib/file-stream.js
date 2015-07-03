module.exports = FileStream

var debug = require('debug')('webtorrent:file-stream')
var inherits = require('inherits')
var path = require('path')
var stream = require('stream')
var MediaStream = require('./media-stream')

inherits(FileStream, stream.Readable)

/**
 * A readable stream of a torrent file.
 *
 * @param {Object} file
 * @param {number} opts.start stream slice of file, starting from this byte (inclusive)
 * @param {number} opts.end stream slice of file, ending with this byte (inclusive)
 * @param {number} opts.pieceLength length of an individual piece
 */
function FileStream (file, opts) {
  var self = this
  if (!(self instanceof FileStream)) return new FileStream(file, opts)
  stream.Readable.call(self, opts)
  debug('new filestream %s', JSON.stringify(opts))

  if (!opts) opts = {}
  if (!opts.start) opts.start = 0
  if (!opts.end) opts.end = file.length - 1

  self.destroyed = false
  self.length = opts.end - opts.start + 1

  var offset = opts.start + file.offset
  var pieceLength = opts.pieceLength

  self.startPiece = offset / pieceLength | 0
  self.endPiece = (opts.end + file.offset) / pieceLength | 0

  self._extname = path.extname(file.name).toLowerCase()
  self._storage = file.storage
  self._piece = self.startPiece
  self._missing = self.length
  self._reading = false
  self._notifying = false
  self._criticalLength = Math.min((1024 * 1024 / pieceLength) | 0, 2)
  self._offset = offset - (self.startPiece * pieceLength)
}

FileStream.prototype._read = function () {
  var self = this
  debug('_read')
  if (self._reading) return
  self._reading = true
  self.notify()
}

FileStream.prototype.notify = function () {
  var self = this
  debug('notify')

  if (!self._reading || self._missing === 0) return
  if (!self._storage.bitfield.get(self._piece)) {
    return self._storage.emit('critical', self._piece, self._piece + self._criticalLength)
  }

  if (self._notifying) return
  self._notifying = true

  var p = self._piece
  debug('before read %s', p)
  self._storage.read(self._piece++, function (err, buffer) {
    debug('after read %s (length %s) (err %s)', p, buffer.length, err && err.message)
    self._notifying = false

    if (self.destroyed) return

    if (err) {
      self._storage.emit('error', err)
      return self.destroy(err)
    }

    if (self._offset) {
      buffer = buffer.slice(self._offset)
      self._offset = 0
    }

    if (self._missing < buffer.length) {
      buffer = buffer.slice(0, self._missing)
    }
    self._missing -= buffer.length

    debug('pushing buffer of length %s', buffer.length)
    self._reading = false
    self.push(buffer)

    if (self._missing === 0) self.push(null)
  })
}

FileStream.prototype.pipe = function (dst) {
  var self = this
  var pipe = stream.Readable.prototype.pipe

  // <video> or <audio> tag
  if (dst && (dst.nodeName === 'VIDEO' || dst.nodeName === 'AUDIO')) {
    var type = {
      '.m4a': 'audio/mp4; codecs="mp4a.40.5"',
      '.m4v': 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
      '.webm': 'video/webm; codecs="vorbis, vp8"'
    }[self._extname]
    return pipe.call(self, new MediaStream(dst, { type: type }))
  } else {
    return pipe.call(self, dst)
  }
}

FileStream.prototype.destroy = function () {
  var self = this
  if (self.destroyed) return
  self.destroyed = true
  self._storage.emit('deselect', self.startPiece, self.endPiece, true)
}
