module.exports = Torrent

var bncode = require('bncode')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var magnet = require('magnet-uri')
var parseTorrent = require('parse-torrent')
var Storage = require('./storage')
var Swarm = require('bittorrent-swarm')

var BLOCK_LENGTH = 16 * 1024
var MAX_BLOCK_LENGTH = 128 * 1024
var MAX_OUTSTANDING_REQUESTS = 5
var METADATA_BLOCK_LENGTH = 16 * 1024
var PIECE_TIMEOUT = 10000

var EXTENDED_MESSAGES = {
  ut_metadata: 1
}

inherits(Torrent, EventEmitter)

/**
 * Torrent
 * -------
 * A torrent file
 *
 * @param {string|Buffer} uri   magnet uri or torrent file
 * @param {Object} opts         options object
 */
function Torrent (uri, opts) {
  var self = this
  if (!(self instanceof Torrent)) return new Torrent(uri, opts)
  EventEmitter.call(self)

  if (typeof uri === 'string') {
    // magnet uri
    var info = parseMagnetUri(uri)
    if (!info.infoHash)
      throw new Error('invalid torrent uri')
    self.infoHash = info.infoHash
    self.name = info.name
  } else if (Buffer.isBuffer(uri)) {
    // torrent file
    self._onMetadata(uri)
  }

  self.peerId = opts.peerId
  self.torrentPort = opts.torrentPort
  self.dhtPort = opts.dhtPort

  self.metadata = null
  self.parsedTorrent = null

  self.swarm = new Swarm(self.infoHash, self.peerId, { dht: true })
  self.storage = null

  if (self.torrentPort) {
    self.swarm.listen(self.torrentPort, function (port) {
      self.emit('listening', port)
    })
  }

  self.swarm.on('error', function (err) {
    self.emit('error', err)
  })

  self.swarm.on('wire', self._onWire.bind(self))
}

Object.defineProperty(Torrent.prototype, 'length', {
  get: function () {
    var self = this
    if (!self.parsedTorrent) return 0
    return self.parsedTorrent.length
  }
})

/**
 * Time remaining (in milliseconds)
 */
Object.defineProperty(Torrent.prototype, 'timeRemaining', {
  get: function () {
    var self = this
    var remainingBytes = self.length - self.downloaded
    if (self.swarm.downloadSpeed() === 0) return Infinity
    return (remainingBytes / self.swarm.downloadSpeed()) * 1000
  }
})

/**
 * Percentage complete, represented as a number between 0 and 1.
 */
Object.defineProperty(Torrent.prototype, 'progress', {
  get: function () {
    var self = this
    if (!self.parsedTorrent) return 0
    return self.downloaded / self.parsedTorrent.length
  }
})

Object.defineProperty(Torrent.prototype, 'downloaded', {
  get: function () {
    var self = this
    return (self.storage && self.storage.downloaded) || 0
  }
})

Object.defineProperty(Torrent.prototype, 'uploaded', {
  get: function () {
    var self = this
    return self.swarm.uploaded
  }
})


Object.defineProperty(Torrent.prototype, 'ratio', {
  get: function () {
    var self = this
    if (self.uploaded === 0) return 0
    return self.downloaded / self.uploaded
  }
})

/**
 * Add a peer to the swarm
 * @param {string} addr
 */
Torrent.prototype.addPeer = function (addr) {
  var self = this
  self.swarm.add(addr)
}

Torrent.prototype._onWire = function (wire) {
  var self = this

  // Send KEEP-ALIVE (every 60s) so peers will not disconnect the wire
  wire.setKeepAlive(true)

  // If peer supports DHT, send PORT message to report DHT node listening port
  if (wire.peerExtensions.dht) {
    console.log(wire.remoteAddress, 'supports DHT')
    wire.port(self.dhtPort)
  }

  // When peer sends PORT, add them to the routing table
  wire.on('port', function (port) {
    console.log(wire.remoteAddress, 'port', port)
    // TODO: DHT doesn't have a routing table yet
    // dht.add(wire.remoteAddress, port)
  })

  // Timeout for piece requests to this peer
  wire.setTimeout(PIECE_TIMEOUT)

  // Support extended messages:
  // - ut_metadata (metadata fetching, trackerless torrents)
  if (wire.peerExtensions.extended) {
    console.log(wire.remoteAddress, 'supports extended messages', wire.peerExtensions)

    var extendedMessage = {
      m: EXTENDED_MESSAGES
    }

    // Only send metadata_size if we have complete metadata
    if (self.metadata)
      extendedMessage.metadata_size = self.metadata.length

    wire.extended(0, extendedMessage)
  }

  wire.on('extended', function (ext, buf) {
    console.log(wire.remoteAddress, 'extended', ext)

    if (ext === 0) // 0 = handshake
      self._onExtendedHandshake(wire, buf)
    else if (ext === EXTENDED_MESSAGES.ut_metadata)
      self._onUtMetadata(wire, buf)
  })

  if (self.metadata) {
    self._onWireWithMetadata(wire)
  }
}

Torrent.prototype._onWireWithMetadata = function (wire) {
  var self = this

  function requestPiece (index) {
    var len = wire.requests.length
    if (len >= MAX_OUTSTANDING_REQUESTS) return

    var endGame = (len === 0 && self.storage.numMissing < 30)
    var block = self.storage.selectBlock(index, endGame)
    if (!block) return

    console.log(wire.remoteAddress, 'requestPiece', index, 'offset', block.offset, 'length', block.length)
    wire.request(index, block.offset, block.length, function (err, bufffer) {
      if (err)
        return self.storage.deselectBlock(index, block.offset)

      self.storage.writeBlock(index, block.offset, bufffer)
      requestPieces()
    });
  }

  function requestPieces () {
    for (var index = 0, len = wire.peerPieces.length; index < len; index++) {
      if (wire.peerPieces[index] && self.storage.pieces[index]) {
        // if peer has this piece AND it's a valid piece, then request blocks
        requestPiece(index)
      }
    }
  }

  wire.on('have', function (index) {
    if (wire.peerChoking || !self.storage.pieces[index])
      return
    requestPiece(index)
  });

  wire.on('unchoke', requestPieces)

  wire.once('interested', function () {
    wire.unchoke()
  })

  wire.on('request', function (index, offset, length, cb) {
    // Disconnect from peers that request more than 128KB, per spec
    if (length > MAX_BLOCK_LENGTH) {
      console.error(wire.remoteAddress, 'requested invalid block size', length)
      return wire.destroy()
    }

    process.nextTick(function () {
      var block = self.storage.readBlock(index, offset, length)
      if (!block) return cb(new Error('requested block not available'))
      cb(null, block)
    })
  })

  wire.bitfield(self.storage.bitfield) // always send bitfield (required)
  wire.interested() // always start out interested
}

Torrent.prototype._onExtendedHandshake = function (wire, buf) {
  var self = this
  var dict
  try {
    dict = bncode.decode(buf.toString())
    console.log(wire.remoteAddress, 'extended handshake' + JSON.stringify(dict))
  } catch (e) {
    console.error(wire.remoteAddress, 'extended handshake error', e.message)
    return
  }
  if (!dict) return

  // If torrent is missing metadata and peer supports ut_metadata extension,
  // then request all metadata pieces
  if (!self.metadata && dict.metadata_size && dict.m && dict.m.ut_metadata) {
    var numPieces = Math.ceil(dict.metadata_size / METADATA_BLOCK_LENGTH)
    wire.metadata = new Buffer(dict.metadata_size)

    console.log('metadata size: ' + dict.metadata_size)
    console.log(numPieces + ' pieces')

    // request all pieces
    for (var piece = 0; piece < numPieces; piece++) {
      wire.extended(dict.m.ut_metadata, {
        msg_type: 0,
        piece: piece
      })
    }
  }
}

// 0 - request
// 1 - data
// 2 - reject
Torrent.prototype._onUtMetadata = function (wire, buf) {
  var self = this

  var dict
  var data
  try {
    var str = buf.toString()
    var dataIndex = str.indexOf('ee') + 2
    dict = bncode.decode(str.substring(0, dataIndex))
    data = buf.slice(dataIndex)
    console.log(wire.remoteAddress, 'ut_metadata', JSON.stringify(dict), 'metadata byte length', data.length)
  } catch (e) {
    console.error('Error decoding extended message: ' + e.message)
  }
  if (!dict) return

  switch (dict.msg_type) {
    // ut_metadata request (from peer)
    // example: {'msg_type': 0, 'piece': 0}
    case 0:
      // TODO
      break
    // ut_metadata data (in response to our request)
    // example: {'msg_type': 1, 'piece': 0, 'total_size': 3425}
    case 1:
      data.copy(wire.metadata, dict.piece * METADATA_BLOCK_LENGTH)
      self._onMetadata(wire.metadata)
      break
    // ut_metadata reject (peer doesn't have piece we requested)
    // {'msg_type': 2, 'piece': 0}
    case 2:
      // TODO
      break
  }
}

Torrent.prototype._onMetadata = function (metadata) {
  var self = this

  self.metadata = metadata

  try {
    var info = bncode.decode(metadata)
    self.torrentFile = bncode.encode({
      'announce-list': [],
      infoHash: self.infoHash,
      info: info
    })
    self.parsedTorrent = parseTorrent(self.torrentFile)
  } catch (e) {
    console.error(e)
    return
  }

  self.name = self.parsedTorrent.name
  self.infoHash = self.parsedTorrent.infoHash

  self.storage = new Storage(self.parsedTorrent)
  self.storage.on('piece', self._onStoragePiece.bind(self))
  self.storage.on('file', function (file) {
    console.log('FILE', file.name)
  })
  self.storage.on('done', function () {
    console.log('done with torrent!')
  })

  self.swarm.wires.forEach(function (wire) {
    self._onWireWithMetadata(wire)
  })
}

/**
 * When a piece is fully downloaded, notify all peers with a HAVE message.
 * @param  {Piece} piece
 */
Torrent.prototype._onStoragePiece = function (piece) {
  var self = this
  console.log('PIECE', piece.index)
  self.swarm.wires.forEach(function (wire) {
    wire.have(piece.index)
  })
}

//
// HELPER METHODS
//

/**
 * Given a magnet URI, return infoHash and name
 * @param  {string} uri
 * @return {Object}
 */
function parseMagnetUri (uri) {
  var parsed = magnet(uri)
  return {
    name: parsed.dn, // displayName
    infoHash: parsed.xt && parsed.xt.split('urn:btih:')[1]
  }
}
