var WebTorrent = require('webtorrent')
var fs = require('fs')

var client = new WebTorrent()
var magnetURI = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d'

client.download(magnetURI, function (torrent) {
  // Got torrent metadata!
  console.log('Torrent magnet link:', torrent.magnetURI)

  torrent.files.forEach(function (file) {
    // Stream each file to the disk
    var source = file.createReadStream()
    var destination = fs.createWriteStream(file.name)
    source.pipe(destination)
  })
})
