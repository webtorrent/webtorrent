var WebTorrent = require('webtorrent')

var client = new WebTorrent()

// Go to https://instant.io, seed a file and use the magnet uri generated
var magnetUri = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36'

client.add(magnetUri, function (torrent) {
  // Got torrent metadata!
  console.log('Torrent info hash:', torrent.infoHash)

  torrent.files.forEach(function (file) {
    // Get a url for each file
    file.getBlobURL(function (err, url) {
      if (err) throw err

      // Add a link to the page
      var a = document.createElement('a')
      a.download = file.name
      a.href = url
      a.textContent = 'Download ' + file.name
      document.body.appendChild(a)
    })
  })
})
