// TODO: support blocklists

module.exports = WebTorrent

var Client = function () {} // require('bittorrent-client')
var fs = require('fs')
var http = require('http')
var inherits = require('inherits')
var mime = require('mime')
var rangeParser = require('range-parser')

inherits(WebTorrent, Client)

function WebTorrent (torrent, opts) {
  var self = this
  Client.call(self, torrent, opts)

  self.index = opts.index
  self._ready = false

  if (!opts.list) {
    self._startServer()
  }

  // TODO: add event that signals that all files that are "interesting" to the user have
  // completed and handle it by stopping fetching additional data from the network
}

WebTorrent.prototype.add = function (torrentId, cb) {
  var self = this

  if (Client.toInfoHash(torrentId)) {
    // magnet uri, info hash, or torrent file (all can be handled by bittorrent-client)
    var torrent = Client.prototype.add.call(self, torrentId)
    process.nextTick(function () {
      cb(null, torrent)
    })
  } else if (/^https?:/.test(torrentId)) {
    // http or https url to torrent file
    http.get(torrentId, function (res) {
      res.pipe(concat(function (torrent) {
        var torrent = Client.prototype.add.call(self, torrent)
        cb(null, torrent)
      }))
    }).on('error', function (err) {
      cb(new Error('Error downloading torrent from ' + torrentId + '\n' + err.message))
    })
  } else {
    // assume it's a filesystem path
    fs.readFile(torrentId, function (err, torrent) {
      if (err) {
        return cb(new Error('Cannot add torrent. Require one of: magnet uri, ' +
          'info hash, torrent file, http url, or filesystem path'))
      }
      var torrent = Client.prototype.add.call(self, torrent)
      cb(null, torrent)
    })
  }
}

WebTorrent.prototype._startServer = function () {
  var self = this
  self.server = http.createServer()
  self.on('ready', self._onReady.bind(self))
  server.on('request', self._onRequest.bind(self))
}

WebTorrent.prototype._onReady = function () {
  var self = this
  self._ready = true

  // if no index specified, use largest file
  if (typeof self.index !== 'number') {
    var largestFile = self.files.reduce(function (a, b) {
      return a.length > b.length ? a : b
    })
    self.index = self.files.indexOf(largestFile)
  }

  // TODO
  self.files[self.index].select()
}

WebTorrent.prototype._onRequest = function (req, res) {
  var self = this
  var u = url.parse(req.url)

  if (u.pathname === '/favicon.ico') {
    return res.end()
  }
  if (u.pathname === '/') {
    u.pathname = '/' + self.index
  }

  var i = Number(u.pathname.slice(1))

  if (isNaN(i) || i >= e.files.length || !self._ready) {
    res.statusCode = 404
    return res.end()
  }

  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Content-Type', mime.lookup(file.name))

  var file = e.files[i]
  var range = req.headers.range

  if (!range) {
    res.statusCode = 206
    res.setHeader('Content-Length', file.length)
    if (req.method === 'HEAD') {
      return res.end()
    }
    pump(file.createReadStream(), res)
    return
  }

  range = rangeParser(file.length, range)[0] // don't support multi-range reqs
  res.statusCode = 206

  var rangeStr = 'bytes ' + range.start + '-' + range.end + '/' + file.length
  res.setHeader('Content-Range', rangeStr)
  res.setHeader('Content-Length', range.end - range.start + 1)

  if (req.method === 'HEAD') {
    return res.end()
  }
  pump(file.createReadStream(range), res)
}
