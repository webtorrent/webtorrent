var WebTorrent = require('webtorrent')

var client = new WebTorrent()

client.add(magnet_uri, function (torrent) {
  // Got torrent metadata!
  console.log('Torrent info hash:', torrent.infoHash)

  // Let's say the first file is a webm (vp8) or mp4 (h264) video...
  var file = torrent.files[0]

  // Create a video element
  var video = document.createElement('video')
  video.controls = true
  document.body.appendChild(video)

  // Stream the video into the video tag
  file.createReadStream().pipe(video)
})
