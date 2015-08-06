var WebTorrent = require('webtorrent')

var client = new WebTorrent()
var magnetUri = '...'

client.add(magnetUri, function (torrent) {
  // Got torrent metadata!
  console.log('Torrent info hash:', torrent.infoHash)

  // Let's say the first file is a webm (vp8) or mp4 (h264) video...
  var file = torrent.files[0]

  // Stream the video!
  // Specify a container element (CSS selector or reference to DOM node)
  file.appendTo('body')
  })
})
