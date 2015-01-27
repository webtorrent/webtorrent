var WebTorrent = require('webtorrent')
var fs = require('fs')

var client = new WebTorrent()
var magnetUri = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36'

client.download(magnetUri, function (torrent) {
  // Got torrent metadata!
  console.log('Torrent info hash:', torrent.infoHash)

  torrent.files.forEach(function (file) {
    // Stream each file to the disk
    var source = file.createReadStream()
    var destination = fs.createWriteStream(file.name)
    source.pipe(destination)
  })
})
