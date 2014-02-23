// Load pre-compiled handlebars templates and put them on require('handlebars').templates
if (!require('handlebars').templates) {
  require('./views/compiled')
}

var App = require('./lib/app')
var TorrentManager = require('./lib/torrent-manager')

if (window.name === 'app') {
  new App(window.torrentManager)
} else {
  new TorrentManager()
}






