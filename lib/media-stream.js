module.exports = MediaStream

var debug = require('debug')('webtorrent:media-stream')
var inherits = require('inherits')
var once = require('once')
var stream = require('stream')

var MediaSource = typeof window !== 'undefined' &&
  (window.MediaSource || window.WebKitMediaSource)

inherits(MediaStream, stream.Writable)

function MediaStream (media, opts) {
  var self = this
  if (!(self instanceof MediaStream)) return new MediaStream(media, opts)
  stream.Writable.call(self, opts)

  self.media = media
  opts = opts || {}
  opts.type = opts.type || 'video/webm; codecs="vorbis,vp8"'

  debug('new mediastream %s %s', media, JSON.stringify(opts))

  self._mediaSource = new MediaSource()
  self._playing = false
  self._sourceBuffer = null
  self._cb = null

  self.media.src = window.URL.createObjectURL(self._mediaSource)

  var sourceopen = once(function () {
    self._sourceBuffer = self._mediaSource.addSourceBuffer(opts.type)
    self._sourceBuffer.addEventListener('updateend', self._flow.bind(self))
    self._flow()
  })
  self._mediaSource.addEventListener('webkitsourceopen', sourceopen, false)
  self._mediaSource.addEventListener('sourceopen', sourceopen, false)

  self.on('finish', function () {
    debug('finish')
    self._mediaSource.endOfStream()
  })
  window.vs = self
}

MediaStream.prototype._write = function (chunk, encoding, cb) {
  var self = this
  if (!self._sourceBuffer) {
    self._cb = function (err) {
      if (err) return cb(err)
      self._write(chunk, encoding, cb)
    }
    return
  }

  if (self._sourceBuffer.updating)
    return cb(new Error('Cannot append buffer while source buffer updating'))

  self._sourceBuffer.appendBuffer(chunk)
  debug('appendBuffer %s', chunk.length)
  self._cb = cb
  if (!self._playing) {
    self.media.play()
    self._playing = true
  }
}

MediaStream.prototype._flow = function () {
  var self = this
  debug('flow')
  if (self._cb) {
    self._cb(null)
  }
}
