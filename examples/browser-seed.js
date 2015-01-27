var dragDrop = require('drag-drop/buffer')
var WebTorrent = require('webtorrent')

var client = new WebTorrent()

// When user drops files on the browser, create a new torrent and start seeding it!
dragDrop('body', function (files) {
  client.seed(files, function onTorrent (torrent) {
    // Client is seeding the file!
    console.log('Torrent info hash:', torrent.infoHash)
  })
})
