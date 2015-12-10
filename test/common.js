var fs = require('fs')
var path = require('path')
var parseTorrent = require('parse-torrent')

var content = path.join(__dirname, 'content')
var torrents = path.join(__dirname, 'torrents')

module.exports = {
  // Leaves of Grass by Walt Whitman.epub
  leaves: {
    contentPath: path.join(content, 'Leaves of Grass by Walt Whitman.epub'),
    torrentPath: path.join(torrents, 'leaves.torrent'),
    content: fs.readFileSync(
      path.join(content, 'Leaves of Grass by Walt Whitman.epub')
    ),
    torrent: fs.readFileSync(path.join(torrents, 'leaves.torrent')),
    parsedTorrent: parseTorrent(
      fs.readFileSync(path.join(torrents, 'leaves.torrent'))
    ),
    magnetURI: parseTorrent.toMagnetURI(parseTorrent(
      fs.readFileSync(path.join(torrents, 'leaves.torrent'))
    ))
  },

  // Folder which contains single file
  folder: {
    contentPath: path.join(content, 'folder'),
    torrentPath: path.join(torrents, 'folder.torrent'),
    torrent: fs.readFileSync(path.join(torrents, 'folder.torrent')),
    parsedTorrent: parseTorrent(
      fs.readFileSync(path.join(torrents, 'folder.torrent'))
    ),
    magnetURI: parseTorrent.toMagnetURI(parseTorrent(
      fs.readFileSync(path.join(torrents, 'folder.torrent'))
    ))
  },

  // Folder which contains multiple files
  numbers: {
    contentPath: path.join(content, 'numbers'),
    torrentPath: path.join(torrents, 'numbers.torrent'),
    torrent: fs.readFileSync(path.join(torrents, 'numbers.torrent')),
    parsedTorrent: parseTorrent(
      fs.readFileSync(path.join(torrents, 'numbers.torrent'))
    ),
    magnetURI: parseTorrent.toMagnetURI(parseTorrent(
      fs.readFileSync(path.join(torrents, 'numbers.torrent'))
    ))
  }
}
