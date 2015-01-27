var WebTorrent = require('webtorrent')

var client = new WebTorrent()
var magnetUri = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36'

client.add(magnetUri, function (torrent) {
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
