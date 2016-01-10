// Torrent and content test files. Content is Public Domain or Creative Commons.

var fs = require('fs')
var path = require('path')
var parseTorrent = require('parse-torrent')

module.exports = {
  // Leaves of Grass, by Walt Whitman
  leaves: {
    contentPath: path.join(__dirname, 'fixtures', 'Leaves of Grass by Walt Whitman.epub'),
    torrentPath: path.join(__dirname, 'fixtures', 'leaves.torrent'),
    content: fs.readFileSync(path.join(__dirname, 'fixtures', 'Leaves of Grass by Walt Whitman.epub')),
    torrent: fs.readFileSync(path.join(__dirname, 'fixtures', 'leaves.torrent')),
    parsedTorrent: parseTorrent(fs.readFileSync(path.join(__dirname, 'fixtures', 'leaves.torrent'))),
    magnetURI: parseTorrent.toMagnetURI(parseTorrent(fs.readFileSync(path.join(__dirname, 'fixtures', 'leaves.torrent'))))
  },

  // Alice's Adventures in Wonderland, by Lewis Carroll
  alice: {
    contentPath: path.join(__dirname, 'fixtures', 'alice.txt'),
    torrentPath: path.join(__dirname, 'fixtures', 'alice.torrent'),
    content: fs.readFileSync(path.join(__dirname, 'fixtures', 'alice.txt')),
    torrent: fs.readFileSync(path.join(__dirname, 'fixtures', 'alice.torrent')),
    parsedTorrent: parseTorrent(fs.readFileSync(path.join(__dirname, 'fixtures', 'alice.torrent'))),
    magnetURI: parseTorrent.toMagnetURI(parseTorrent(fs.readFileSync(path.join(__dirname, 'fixtures', 'alice.torrent'))))
  },

  // Folder which contains single file
  folder: {
    contentPath: path.join(__dirname, 'fixtures', 'folder'),
    torrentPath: path.join(__dirname, 'fixtures', 'folder.torrent'),
    torrent: fs.readFileSync(path.join(__dirname, 'fixtures', 'folder.torrent')),
    parsedTorrent: parseTorrent(fs.readFileSync(path.join(__dirname, 'fixtures', 'folder.torrent'))),
    magnetURI: parseTorrent.toMagnetURI(parseTorrent(fs.readFileSync(path.join(__dirname, 'fixtures', 'folder.torrent'))))
  },

  // Folder which contains multiple files
  numbers: {
    contentPath: path.join(__dirname, 'fixtures', 'numbers'),
    torrentPath: path.join(__dirname, 'fixtures', 'numbers.torrent'),
    torrent: fs.readFileSync(path.join(__dirname, 'fixtures', 'numbers.torrent')),
    parsedTorrent: parseTorrent(fs.readFileSync(path.join(__dirname, 'fixtures', 'numbers.torrent'))),
    magnetURI: parseTorrent.toMagnetURI(parseTorrent(fs.readFileSync(path.join(__dirname, 'fixtures', 'numbers.torrent'))))
  },

  // Torrent file with "private" flag
  bunny: {
    torrentPath: path.join(__dirname, 'fixtures', 'bunny-private.torrent'),
    torrent: fs.readFileSync(path.join(__dirname, 'fixtures', 'bunny-private.torrent')),
    parsedTorrent: parseTorrent(fs.readFileSync(path.join(__dirname, 'fixtures', 'bunny-private.torrent')))
  }
}
