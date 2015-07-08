// TODO: publish this as a standalone module

module.exports = MediaSourceStream

var debug = require('debug')('webtorrent:media-source-stream')
var inherits = require('inherits')
var stream = require('stream')

var MediaSource = typeof window !== 'undefined' && window.MediaSource

inherits(MediaSourceStream, stream.Writable)

function MediaSourceStream (elem, opts) {
  var self = this
  if (!(self instanceof MediaSourceStream)) return new MediaSourceStream(elem, opts)
  stream.Writable.call(self, opts)

  if (!MediaSource) throw new Error('web browser lacks MediaSource support')
  if (!opts) opts = {}
  debug('new MediaSourceStream %s %s', elem, JSON.stringify(opts))

  self._elem = elem
  self._mediaSource = new MediaSource()
  self._sourceBuffer = null
  self._cb = null

  self._type = opts.type || getType(opts.extname)
  if (!self._type) throw new Error('missing `opts.type` or `opts.extname` options')

  self._elem.src = window.URL.createObjectURL(self._mediaSource)

  self._mediaSource.addEventListener('sourceopen', function () {
    if (MediaSource.isTypeSupported(self._type)) {
      self._sourceBuffer = self._mediaSource.addSourceBuffer(self._type)
      self._sourceBuffer.addEventListener('updateend', self._flow.bind(self))
      self._flow()
    } else {
      self._mediaSource.endOfStream('decode')
    }
  })

  self.on('finish', function () {
    debug('finish')
    self._mediaSource.endOfStream()
  })
  window.vs = self
}

MediaSourceStream.prototype._write = function (chunk, encoding, cb) {
  var self = this
  if (!self._sourceBuffer) {
    self._cb = function (err) {
      if (err) return cb(err)
      self._write(chunk, encoding, cb)
    }
    return
  }

  if (self._sourceBuffer.updating) {
    return cb(new Error('Cannot append buffer while source buffer updating'))
  }

  self._sourceBuffer.appendBuffer(chunk)
  debug('appendBuffer %s', chunk.length)
  self._cb = cb
}

MediaSourceStream.prototype._flow = function () {
  var self = this
  debug('flow')
  if (self._cb) {
    self._cb(null)
  }
}

function getType (extname) {
  if (!extname) return null
  if (extname[0] !== '.') extname = '.' + extname
  return {
    '.m4a': 'audio/mp4; codecs="mp4a.40.5"',
    '.m4v': 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
    '.webm': 'video/webm; codecs="vorbis, vp8"'
  }[extname]
}
