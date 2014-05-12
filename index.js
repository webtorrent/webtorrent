// TODO: support blocklists

module.exports = WebTorrent

var Client = require('bittorrent-client')
var fs = require('fs')
var http = require('http')
var inherits = require('inherits')

inherits(WebTorrent, Client)

function WebTorrent (opts) {
  var self = this
  Client.call(self, opts)
  if (!opts) opts = {}

  if (opts.list) {
    return
  }
  
  self.on('torrent', function (torrent) {
    self._onTorrent(torrent)
  })

  // TODO: add event that signals that all files that are "interesting" to the user have
  // completed and handle it by stopping fetching additional data from the network
}

WebTorrent.prototype.add = function (torrentId, cb) {
  var self = this
  if (!cb) cb = function () {}

  // TODO: support passing in an index to file to download
  // self.index = opts.index

  if (!self.ready) {
    return self.once('ready', self.add.bind(self, torrentId, cb))
  }

  // Called once we have a torrentId that bittorrent-client can handle
  function onTorrentId (torrentId) {
    Client.prototype.add.call(self, torrentId, cb)
  }

  if (Client.toInfoHash(torrentId)) {
    // magnet uri, info hash, or torrent file can be handled by bittorrent-client
    process.nextTick(function () {
      onTorrentId(torrentId)
    })
  } else if (/^https?:/.test(torrentId)) {
    // http or https url to torrent file
    http.get(torrentId, function (res) {
      res.pipe(concat(function (torrent) {
        onTorrentId(torrent)
      }))
    }).on('error', function (err) {
      cb(new Error('Error downloading torrent from ' + torrentId + '\n' + err.message))
    })
  } else {
    // assume it's a filesystem path
    fs.readFile(torrentId, function (err, torrent) {
      if (err) {
        return cb(new Error('Cannot add torrent "' + torrentId + '". Torrent id must be one of: magnet uri, ' +
          'info hash, torrent file, http url, or filesystem path.'))
      }
      onTorrentId(torrent)
    })
  }

  return self
}

WebTorrent.prototype._onTorrent = function (torrent) {
  var self = this

  // if no index specified, use largest file
  // TODO: support torrent index selection correctly -- this doesn't work yet
  /*if (typeof torrent.index !== 'number') {
    var largestFile = torrent.files.reduce(function (a, b) {
      return a.length > b.length ? a : b
    })
    torrent.index = torrent.files.indexOf(largestFile)
  }

  // TODO
  torrent.files[torrent.index].select()*/
}
