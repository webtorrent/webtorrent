// TODO: move vlc/airplay/etc. functionality from cmd.js to the module

module.exports = WebTorrent

var Client = require('bittorrent-client')
var concat = require('concat-stream')
var extend = require('extend.js')
var fs = require('fs')
var FSStorage = require('./lib/fs-storage')
var http = require('http')
var inherits = require('inherits')
var mime = require('mime')
var once = require('once')
var parallel = require('run-parallel')
var pump = require('pump')
var rangeParser = require('range-parser')
var url = require('url')

inherits(WebTorrent, Client)

function WebTorrent (opts) {
  var self = this
  opts = opts || {}
  if (opts.blocklist) opts.blocklist = parseBlocklist(opts.blocklist) // TODO: this usage is weird

  Client.call(self, opts)

  if (opts.list) {
    return
  }

  if (opts.port !== false) {
    // start http server
    self.server = http.createServer()
    self.server.on('request', self._onRequest.bind(self))
    self.server.listen(opts.port)
    self.server.once('listening', function () {
      self.emit('listening')
    })
  }

  self.on('torrent', function (torrent) {
    self._onTorrent(torrent)
  })
}

/**
 * Add a new torrent to the client. `torrentId` can be one of:
 *
 * - magnet uri (utf8 string)
 * - torrent file (buffer)
 * - info hash (hex string or buffer)
 * - parsed torrent (from parse-torrent module)
 * - http/https url to a .torrent file (string)
 * - filesystem path to a .torrent file (string)
 *
 * @override
 * @param {string|Buffer|Object} torrentId torrent (choose from above list)
 * @param {Object}        opts      optional torrent-specific options
 * @param {function=}     cb        called when the torrent is ready and has metadata
 */
WebTorrent.prototype.add = function (torrentId, opts, cb) {
  var self = this
  if (!self.ready) {
    return self.once('ready', self.add.bind(self, torrentId, opts, cb))
  }

  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (typeof cb !== 'function') {
    cb = function () {}
  }
  cb = once(cb)

  opts = extend({
    storage: FSStorage
  }, opts)

  self.index = opts.index

  // Called once we have a torrentId that bittorrent-client can handle
  function onTorrentId (torrentId) {
    Client.prototype.add.call(self, torrentId, opts, cb)
  }

  if (Client.toInfoHash(torrentId)) {
    // magnet uri, info hash, torrent file, or parsed torrent can be handled by bittorrent-client
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
      err = new Error('Error downloading torrent from ' + torrentId + '\n' + err.message)
      cb(err)
      self.emit('error', err)
    })
  } else {
    // assume it's a filesystem path
    fs.readFile(torrentId, function (err, torrent) {
      if (err) {
        err = new Error('Cannot add torrent "' + torrentId + '". Torrent id must be one of: magnet uri, ' +
          'info hash, torrent file, http url, or filesystem path.')
        cb(err)
        self.emit('error', err)
      } else {
        onTorrentId(torrent)
      }
    })
  }

  return self
}

/**
 * Destroy the client, including all torrents and connections to peers.
 *
 * @override
 * @param  {function} cb
 */
WebTorrent.prototype.destroy = function (cb) {
  var self = this

  var tasks = [
    Client.prototype.destroy.bind(self)
  ]

  if (self.server) {
    tasks.push(function (cb) {
      try {
        self.server.close(cb)
      } catch (err) {
        cb(null) // ignore error, server was either already closed / not yet listening
      }
    })
  }

  parallel(tasks, cb)
}

WebTorrent.prototype._onTorrent = function (torrent) {
  var self = this

  // if no index specified, use largest file
  if (typeof torrent.index !== 'number') {
    var largestFile = torrent.files.reduce(function (a, b) {
      return a.length > b.length ? a : b
    })
    torrent.index = torrent.files.indexOf(largestFile)
  }

  torrent.files[torrent.index].select()

  // TODO: this won't work with multiple torrents
  self.index = torrent.index
  self.torrent = torrent
}

WebTorrent.prototype._onRequest = function (req, res) {
  var self = this

  if (!self.ready) {
    return self.once('ready', self._onRequest.bind(self, req, res))
  }

  var u = url.parse(req.url)

  if (u.pathname === '/favicon.ico') {
    return res.end()
  }
  if (u.pathname === '/') {
    u.pathname = '/' + self.index
  }

  var i = Number(u.pathname.slice(1))

  if (isNaN(i) || i >= self.torrent.files.length) {
    res.statusCode = 404
    return res.end()
  }

  var file = self.torrent.files[i]
  var range = req.headers.range

  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Content-Type', mime.lookup(file.name))

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

//
// HELPER METHODS
//

function parseBlocklist (filename) {
  // TODO: support gzipped files
  // TODO: convert to number once at load time, instead of each time in bittorrent-client
  var blocklistData = fs.readFileSync(filename, { encoding: 'utf8' })
  var blocklist = []
  blocklistData.split('\n').forEach(function (line) {
    var match = null
    if ((match = /^\s*([^#].*)\s*:\s*([a-f0-9.:]+?)\s*-\s*([a-f0-9.:]+?)\s*$/.exec(line))) {
      blocklist.push({
        reason: match[1],
        startAddress: match[2],
        endAddress: match[3]
      })
    }
  })
  return blocklist
}
