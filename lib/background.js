var TorrentManager = require('./TorrentManager')

module.exports = function () {

  var manager = new TorrentManager()

  // manager.add('magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&dn=Leaves+of+Grass+by+Walt+Whitman.epub')

  manager.on('error', function (err) {
    console.error(err)
    // TODO: Show error in UI somehow
  })

  var mainWindow

  chrome.app.runtime.onLaunched.addListener(function () {
    chrome.app.window.create('window.html', {
      bounds: {
        width: 500,
        height: 600
      },
      frame: 'none',
      id: 'app',
      minWidth: 350,
      minHeight: 165
    }, function (_mainWindow) {
      mainWindow = _mainWindow
      mainWindow.contentWindow.name = 'app'
      // TODO: on add/remove torrent call resizeTo to set window size

    })
  })
}