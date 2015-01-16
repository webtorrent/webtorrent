var WebTorrent = require('webtorrent')
var fs = require('fs')

var client = new WebTorrent()

client.download(magnet_uri, function (torrent) {
  // Got torrent metadata!
  console.log('Torrent info hash:', torrent.infoHash)

  torrent.files.forEach(function (file) {
  	// Stream each file to the disk
    var source = file.createReadStream()
    var destination = fs.createWriteStream(file.name)
    source.pipe(destination)
  })
})
