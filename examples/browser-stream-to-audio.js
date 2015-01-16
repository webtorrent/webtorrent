var WebTorrent = require('webtorrent')

var client = new WebTorrent()

client.add(magnet_uri, function (torrent) {
  // Got torrent metadata!
  console.log('Torrent info hash:', torrent.infoHash)

  // Let's say the first file is an mp3 audio file
  var file = torrent.files[0]

  // Create an audio element
  var audio = document.createElement('audio')
  audio.controls = true
  document.body.appendChild(audio)

  // Stream the audio into the audio tag
  file.createReadStream().pipe(audio)
})
