var App = require('./lib/app')
var TorrentManager = require('./lib/torrent-manager')

if (window.name === 'app') {
  new App(window.torrentManager)
} else {
  new TorrentManager()
}

// "file_handlers": {
//   "torrent": {
//     "types": [
//       "application/x-bittorrent"
//     ],
//     "title": "WebTorrent (BitTorrent client)"
//   }
// },

// navigator.registerProtocolHandler('web+mystuff', 'http://example.com/rph?q=%s', 'My App')

// TODO: if ESC and fullscreen, exit fullscreen

// chrome.runtime.onSuspend.addListener(function() {
//   // Do some simple clean-up tasks.
// })

// TODO: online/offline status
// https://developer.mozilla.org/en-US/docs/Online_and_offline_events
