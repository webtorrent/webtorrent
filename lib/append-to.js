var debug = require('debug')('webtorrent:append-to')
var dezalgo = require('dezalgo')
var MediaSourceStream = require('./media-stream')
var path = require('path')
var videostream = require('videostream')

var VIDEOSTREAM_EXTS = [ '.mp4', '.m4v', '.m4a' ]

var MEDIASOURCE_VIDEO_EXTS = [ '.mp4', '.m4v', '.webm' ]
var MEDIASOURCE_AUDIO_EXTS = [ '.m4a', '.mp3' ]
var MEDIASOURCE_EXTS = MEDIASOURCE_VIDEO_EXTS.concat(MEDIASOURCE_AUDIO_EXTS)

var AUDIO_EXTS = [ '.wav', '.aac', '.ogg', '.oga' ]
var IMAGE_EXTS = [ '.jpg', '.png', '.gif', '.bmp' ]
var IFRAME_EXTS = [ '.css', '.html', '.js', '.md', '.pdf', '.txt' ]

var MediaSource = typeof window !== 'undefined' && window.MediaSource

module.exports = function appendTo (file, rootElem, cb) {
  cb = dezalgo(cb)
  var elem
  var extname = path.extname(file.name).toLowerCase()

  if (rootElem && (rootElem.nodeName === 'VIDEO' || rootElem.nodeName === 'AUDIO')) {
    throw new Error(
      'Invalid video/audio node argument. Argument must be root element that ' +
      'video/audio tag will be appended to.'
    )
  }

  if (MEDIASOURCE_EXTS.indexOf(extname) >= 0) appendToMediaSource()
  else if (AUDIO_EXTS.indexOf(extname) >= 0) appendToAudio()
  else if (IMAGE_EXTS.indexOf(extname) >= 0) appendToImage()
  else if (IFRAME_EXTS.indexOf(extname) >= 0) appendToIframe()
  else cb(new Error('Unsupported file type "' + extname + '": Cannot append to DOM'))

  // TODO: re-use the same video tag
  function appendToMediaSource () {
    if (!MediaSource) {
      return cb(new Error(
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
      createElem()
      elem.addEventListener('error', fallbackToMediaSource)
      elem.addEventListener('playing', onPlaying)
      videostream(file, elem)
      appendElem()
    }

    function useMediaSource () {
      debug('Use MediaSource API for ' + file.name)
      createElem()
      elem.addEventListener('error', fallbackToBlobURL)
      elem.addEventListener('playing', onPlaying)
      file.createReadStream().pipe(new MediaSourceStream(elem, { extname: extname }))
      appendElem()
    }

    function useBlobURL () {
      debug('Use Blob URL for ' + file.name)
      createElem()
      elem.addEventListener('error', fatalError)
      elem.addEventListener('playing', onPlaying)
      appendElem()
      file.getBlobURL(function (err, url) {
        if (err) return fatalError(err)
        elem.src = url
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

    function createElem () {
      if (elem) elem.remove()
      elem = window.elem = document.createElement(tagName)
      elem.controls = true
      elem.autoplay = true
    }

    function appendElem () {
      rootElem.appendChild(elem)
      elem.play()
    }
  }

  function onPlaying () {
    elem.removeEventListener('playing', onPlaying)
    cb(null, elem)
  }

  function appendToAudio () {
    elem = document.createElement('audio')
    elem.controls = true
    elem.autoplay = true
    rootElem.appendChild(elem)
    file.getBlobURL(function (err, url) {
      if (err) return fatalError(err)
      elem.addEventListener('error', fatalError)
      elem.addEventListener('playing', onPlaying)
      elem.src = url
      elem.play()
    })
  }

  function appendToImage () {
    file.getBlobURL(function (err, url) {
      if (err) return fatalError(err)
      elem = document.createElement('img')
      elem.src = url
      elem.alt = file.name
      rootElem.appendChild(elem)
      cb(null)
    })
  }

  function appendToIframe () {
    file.getBlobURL(function (err, url) {
      if (err) return fatalError(err)
      elem = document.createElement('iframe')
      elem.src = url
      if (extname !== '.pdf') elem.sandbox = 'allow-forms allow-scripts'
      rootElem.appendChild(elem)
      cb(null)
    })
  }

  function fatalError (err) {
    if (elem) elem.remove()
    err.message = 'Error appending file "' + file.name + '" to DOM: ' + err.message
    debug(err.message)
    if (cb) cb(err)
  }
}
