var App = require('./lib/app')
var TorrentManager = require('./lib/torrent-manager')

if (window.name === 'app') {
  new App(window.torrentManager)
} else {
  new TorrentManager()
}






