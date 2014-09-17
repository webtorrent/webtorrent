// TODO: move vlc/airplay/etc. functionality from cmd.js to the module

module.exports = WebTorrent

var Client = require('bittorrent-client')
var debug = require('debug')('webtorrent')
var extend = require('extend.js')
var FSStorage = require('./lib/fs-storage')
var inherits = require('inherits')
var parallel = require('run-parallel')
var Server = require('./lib/server')

inherits(WebTorrent, Client)

function WebTorrent (opts) {
  var self = this
  if (!opts) opts = {}
  debug('new webtorrent')

  Client.call(self, opts)

  self.listening = false

  if (opts.list) return

  if (opts.port !== false && typeof Server === 'function') {
    self.server = new Server(self, opts.port)
    self.server.on('listening', function () {
      self.listening = true
      self.emit('listening')
    })
  }

  self.on('torrent', self._onTorrent.bind(self))
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
 * @param {Object}               opts      optional torrent-specific options
 * @param {function=}            ontorrent called when the torrent is ready (has metadata)
 */
WebTorrent.prototype.add =
WebTorrent.prototype.download = function (torrentId, opts, ontorrent) {
  var self = this
  debug('add %s', torrentId)
  if (typeof opts === 'function') {
    ontorrent = opts
    opts = {}
  }

  opts = extend({
    storage: typeof FSStorage === 'function' && FSStorage
  }, opts)

  // TODO: fix this to work with multiple torrents
  self.index = opts.index

  return Client.prototype.add.call(self, torrentId, opts, ontorrent)
}

/**
 * Destroy the client, including all torrents and connections to peers.
 *
 * @override
 * @param  {function} cb
 */
WebTorrent.prototype.destroy = function (cb) {
  var self = this
  debug('destroy')
  var tasks = [
    Client.prototype.destroy.bind(self)
  ]

  if (self.server) {
    tasks.push(function (cb) {
      try {
        self.server.close(cb)
      } catch (err) {
        // ignore error, server was already closed or not listening
        cb(null)
      }
    })
  }

  parallel(tasks, cb)
  return self
}

WebTorrent.prototype._onTorrent = function (torrent) {
  var self = this
  debug('on torrent')

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
