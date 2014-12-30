module.exports = VideoStream

var debug = require('debug')('webtorrent:video-stream')
var inherits = require('inherits')
var once = require('once')
var stream = require('stream')

var MediaSource = typeof window !== 'undefined' &&
  (window.MediaSource || window.WebKitMediaSource)

inherits(VideoStream, stream.Writable)

function VideoStream (video, opts) {
  var self = this
  if (!(self instanceof VideoStream)) return new VideoStream(video, opts)
  stream.Writable.call(self, opts)

  self.video = video
  opts = opts || {}
  opts.type = opts.type || 'video/webm; codecs="vorbis,vp8"'

  debug('new videostream %s %s', video, JSON.stringify(opts))

  self._mediaSource = new MediaSource()
  self._playing = false
  self._sourceBuffer = null
  self._cb = null

  self.video.src = window.URL.createObjectURL(self._mediaSource)

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

VideoStream.prototype._write = function (chunk, encoding, cb) {
  var self = this
  if (!self._sourceBuffer)
    return self._cb = function () {
      self._write(chunk, encoding, cb)
    }

  if (self._sourceBuffer.updating)
    return cb(new Error('Cannot append buffer while source buffer updating'))

  self._sourceBuffer.appendBuffer(chunk)
  debug('appendBuffer %s', chunk.length)
  self._cb = cb
  if (!self._playing) {
    self.video.play()
    self._playing = true
  }
}

VideoStream.prototype._flow = function () {
  var self = this
  debug('flow')
  if (self._cb) {
    self._cb(null)
  }
}
