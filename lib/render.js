var debug = require('debug')('webtorrent:render')
var MediaSourceStream = require('mediasource')
var path = require('path')
var videostream = require('videostream')

var VIDEOSTREAM_EXTS = [ '.mp4', '.m4v', '.m4a' ]

var MEDIASOURCE_VIDEO_EXTS = [ '.mp4', '.m4v', '.webm' ]
var MEDIASOURCE_AUDIO_EXTS = [ '.m4a', '.mp3' ]
var MEDIASOURCE_EXTS = MEDIASOURCE_VIDEO_EXTS.concat(MEDIASOURCE_AUDIO_EXTS)

var AUDIO_EXTS = [ '.wav', '.aac', '.ogg', '.oga' ]
var IMAGE_EXTS = [ '.jpg', '.jpeg', '.png', '.gif', '.bmp' ]
var IFRAME_EXTS = [ '.css', '.html', '.js', '.md', '.pdf', '.txt' ]

var MediaSource = typeof window !== 'undefined' && window.MediaSource

module.exports = function render (file, getElem, cb) {
  if (!cb) cb = noop
  var elem
  var extname = path.extname(file.name).toLowerCase()
  var currentTime = 0

  if (MEDIASOURCE_EXTS.indexOf(extname) >= 0) renderMediaSource()
  else if (AUDIO_EXTS.indexOf(extname) >= 0) renderAudio()
  else if (IMAGE_EXTS.indexOf(extname) >= 0) renderImage()
  else if (IFRAME_EXTS.indexOf(extname) >= 0) renderIframe()
  else nextTick(cb, new Error('Unsupported file type "' + extname + '": Cannot append to DOM'))

  function renderMediaSource () {
    if (!MediaSource) {
      return nextTick(cb, new Error(
        'Video/audio streaming is not supported in your browser. You can still share ' +
        'or download ' + file.name + ' (once it\'s fully downloaded). Use Chrome for ' +
        'MediaSource support.'
      ))
    }

    var tagName = MEDIASOURCE_VIDEO_EXTS.indexOf(extname) >= 0 ? 'video' : 'audio'

    if (VIDEOSTREAM_EXTS.indexOf(extname) >= 0) useVideostream()
    else useMediaSource()

    function useVideostream () {
      debug('Use `videostream` package for ' + file.name)
      prepareElem()
      elem.addEventListener('error', fallbackToMediaSource)
      elem.addEventListener('playing', onPlaying)
      videostream(file, elem)
    }

    function useMediaSource () {
      debug('Use MediaSource API for ' + file.name)
      prepareElem()
      elem.addEventListener('error', fallbackToBlobURL)
      elem.addEventListener('playing', onPlaying)

      file.createReadStream().pipe(new MediaSourceStream(elem, { extname: extname }))
      if (currentTime) elem.currentTime = currentTime
    }

    function useBlobURL () {
      debug('Use Blob URL for ' + file.name)
      prepareElem()
      elem.addEventListener('error', fatalError)
      elem.addEventListener('playing', onPlaying)
      file.getBlobURL(function (err, url) {
        if (err) return fatalError(err)
        elem.src = url
        if (currentTime) elem.currentTime = currentTime
      })
    }

    function fallbackToMediaSource (err) {
      debug('videostream error: fallback to MediaSource API: %o', err.message || err)
      elem.removeEventListener('error', fallbackToMediaSource)
      elem.removeEventListener('playing', onPlaying)

      useMediaSource()
    }

    function fallbackToBlobURL (err) {
      debug('MediaSource API error: fallback to Blob URL: %o', err.message || err)
      elem.removeEventListener('error', fallbackToBlobURL)
      elem.removeEventListener('playing', onPlaying)

      useBlobURL()
    }

    function prepareElem () {
      if (!elem) {
        elem = getElem(tagName)

        elem.addEventListener('progress', function () {
          currentTime = elem.currentTime
        })
      }
    }
  }

  function onPlaying () {
    elem.removeEventListener('playing', onPlaying)
    cb(null, elem)
  }

  function renderAudio () {
    elem = getElem('audio')
    file.getBlobURL(function (err, url) {
      if (err) return fatalError(err)
      elem.addEventListener('error', fatalError)
      elem.addEventListener('playing', onPlaying)
      elem.src = url
    })
  }

  function renderImage () {
    elem = getElem('img')
    file.getBlobURL(function (err, url) {
      if (err) return fatalError(err)
      elem.src = url
      elem.alt = file.name
      cb(null, elem)
    })
  }

  function renderIframe () {
    elem = getElem('iframe')

    file.getBlobURL(function (err, url) {
      if (err) return fatalError(err)
      elem.src = url
      if (extname !== '.pdf') elem.sandbox = 'allow-forms allow-scripts'
      cb(null, elem)
    })
  }

  function fatalError (err) {
    err.message = 'Error rendering file "' + file.name + '": ' + err.message
    debug(err.message)
    if (cb) cb(err)
  }
}

function noop () {}

function nextTick (cb, err, val) {
  process.nextTick(function () {
    if (cb) cb(err, val)
  })
}
