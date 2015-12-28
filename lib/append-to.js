var render = require('./render')

module.exports = function appendTo (file, rootElem, cb) {
  if (rootElem && (rootElem.nodeName === 'VIDEO' || rootElem.nodeName === 'AUDIO')) {
    throw new Error(
      'Invalid video/audio node argument. Argument must be root element that ' +
      'video/audio tag will be appended to.'
    )
  }

  render(file, function (tagName) {
    if (tagName === 'video' || tagName === 'audio') return createMedia(tagName)
    else return createElem(tagName)
  }, function (err, elem) {
    if (err && elem) elem.remove()
    cb(err, elem)
  })

  function createMedia (tagName) {
    var elem = createElem(tagName)
    elem.controls = true
    elem.autoplay = true // for chrome
    elem.play() // for firefox
    rootElem.appendChild(elem)
    return elem
  }

  function createElem (tagName) {
    var elem = document.createElement(tagName)
    rootElem.appendChild(elem)
    return elem
  }
}
