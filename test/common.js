var fs = require('fs')
var path = require('path')
var parseTorrent = require('parse-torrent')

module.exports = {
  // Leaves of Grass by Walt Whitman.epub
  leaves: {
    contentPath: path.join(__dirname, 'content', 'Leaves of Grass by Walt Whitman.epub'),
    torrentPath: path.join(__dirname, 'torrents', 'leaves.torrent'),
    content: fs.readFileSync(path.join(__dirname, 'content', 'Leaves of Grass by Walt Whitman.epub')),
    torrent: fs.readFileSync(path.join(__dirname, 'torrents', 'leaves.torrent')),
    parsedTorrent: parseTorrent(
      fs.readFileSync(path.join(__dirname, 'torrents', 'leaves.torrent'))
    ),
    magnetURI: parseTorrent.toMagnetURI(parseTorrent(
      fs.readFileSync(path.join(__dirname, 'torrents', 'leaves.torrent'))
    ))
  },

  // Folder which contains single file
  folder: {
    contentPath: path.join(__dirname, 'content', 'folder'),
    torrentPath: path.join(__dirname, 'torrents', 'folder.torrent'),
    torrent: fs.readFileSync(path.join(__dirname, 'torrents', 'folder.torrent')),
    parsedTorrent: parseTorrent(
      fs.readFileSync(path.join(__dirname, 'torrents', 'folder.torrent'))
    ),
    magnetURI: parseTorrent.toMagnetURI(parseTorrent(
      fs.readFileSync(path.join(__dirname, 'torrents', 'folder.torrent'))
    ))
  },

  // Folder which contains multiple files
  numbers: {
    contentPath: path.join(__dirname, 'content', 'numbers'),
    torrentPath: path.join(__dirname, 'torrents', 'numbers.torrent'),
    torrent: fs.readFileSync(path.join(__dirname, 'torrents', 'numbers.torrent')),
    parsedTorrent: parseTorrent(
      fs.readFileSync(path.join(__dirname, 'torrents', 'numbers.torrent'))
    ),
    magnetURI: parseTorrent.toMagnetURI(parseTorrent(
      fs.readFileSync(path.join(__dirname, 'torrents', 'numbers.torrent'))
    ))
  }
}
