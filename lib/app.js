var $ = require('jquery')
var key = require('keymaster')

module.exports = function () {
  setupWindow()
}

function setupWindow () {
  $('.system .close').on('click', function () {
    console.log('CLOSE')
    chrome.app.window.current().close()
  })
  $('.system .minimize').on('click', function () {
    chrome.app.window.current().minimize()
  })
  $('.system .maximize').on('click', function () {
    chrome.app.window.current().maximize()
  })
}