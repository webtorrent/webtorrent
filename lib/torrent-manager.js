module.exports = torrentManager 

var debug = require('debug')('webtorrent:torrentmanager')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var parseTorrent = require('parse-torrent')
var Torrent = require('./torrent')
var Storage = require('./storage')
var Server = require('./server') // browser exclude

inherits(torrentManager, EventEmitter)

 function torrentManager(torrentId, opts) {
  var self = this
 self._storageImpl = opts.storage || Storage

  var parsedTorrent = parseTorrent(torrentId)
  if (parsedTorrent && parsedTorrent.infoHash) {
    onTorrentId(parsedTorrent)

  } else if (typeof hh.get === 'function' && /^https?:/.test(torrentId)) {
    // http or https url to torrent file
    httpGet(torrentId, function (err, torrent) {
      if (err)
        return self.emit('error', new Error('error downloading torrent: ' + err.message))
      onTorrentId(torrent)
    })

  } else if (typeof fs.readFile === 'function') {
    // assume it's a filesystem path
    fs.readFile(torrentId, function (err, torrent) {
      if (err) return self.emit('error', new Error('invalid torrent id'))
      onTorrentId(torrent)
    })

  } else throw new Error('invalid torrent id')


  function onTorrentId (torrentId) {
    parsedTorrent = parseTorrent(torrentId)
    self.infoHash = parsedTorrent.infoHash
    debug(self.infoHash);
    if (parsedTorrent.name) self.name = parsedTorrent.name // preliminary name
    self.torrent = new Torrent(self, parsedTorrent, opts);
    if (parsedTorrent.info) self.onMetadata(parsedTorrent)
  }
}

torrentManager.prototype.createServer = function (opts) {
  var self = this
  if (typeof Server === 'function' /* browser exclude */) {
    return new Server(self.torrent, opts)
  }
}

/**
 * Called when the metadata is received.
 */
torrentManager.prototype.onMetadata = function (metadata) {
  var self = this
  if (self.metadata || self._destroyed) return
  debug('got metadata')

  if (metadata && metadata.infoHash) {
    // `metadata` is a parsed torrent (from parse-torrent module)
    self.metadata = parseTorrent.toBuffer(metadata)
    self.parsedTorrent = metadata
  } else {
    self.metadata = metadata
    try {
      self.parsedTorrent = parseTorrent(self.metadata)
    } catch (err) {
      return self.emit('error', err)
    }
  }

  self.storage = new self._storageImpl(self.parsedTorrent, self.storageOpts)
  if (self.verify) {
    process.nextTick(function () {
      debug('verifying existing torrent data')
      var numPieces = 0
      var numVerified = 0

      // TODO: move storage verification to storage.js?
      parallel(self.storage.pieces.map(function (piece) {
        return function (cb) {
          self.storage.read(piece.index, function (err, buffer) {
            numPieces += 1
            self.emit('verifying', {
              percentDone: 100 * numPieces / self.storage.pieces.length,
              percentVerified: 100 * numVerified / self.storage.pieces.length,
            })

            if (!err && buffer) {
              // TODO: this is a bit hacky; figure out a cleaner way of verifying the buffer
              piece.verify(buffer)
              numVerified += piece.verified
              debug('piece ' + (piece.verified ? 'verified' : 'invalid') + ' ' + piece.index)
            }
            // continue regardless of whether piece verification failed
            cb()
          }, true) // forces override to allow reading from non-verified pieces
        }
      }), function() { self.torrent.attachStorage(self.storage) })
    })
  } else {
    process.nextTick(function() { self.torrent.attachStorage(self.storage) })
  }

  process.nextTick(function () {
    self.torrent.updateMetadata(self.parsedTorrent)
    self.emit('metadata')
  })
}