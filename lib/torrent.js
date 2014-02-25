module.exports = Torrent

var bncode = require('bncode')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var magnet = require('magnet-uri')
var parseTorrent = require('parse-torrent')
var Swarm = require('bittorrent-swarm')

var METADATA_BLOCK_SIZE = 16 * 1024
var WIRE_TIMEOUT = 10000

var EXTENDED_MESSAGES = {
  ut_metadata: 1
}

inherits(Torrent, EventEmitter)

function Torrent (uri, opts) {
  var self = this
  if (!(self instanceof Torrent)) return new Torrent(uri, opts)
  EventEmitter.call(self)

  var info = parseMagnetUri(uri)
  if (!info.infoHash)
    throw new Error('invalid torrent uri')

  self.infoHash = info.infoHash
  self.title = info.title

  self.metadataRaw = null
  self.metadata = null
  self.file = null

  self.peerId = opts.peerId
  self.torrentPort = opts.torrentPort
  self.dhtPort = opts.dhtPort

  self.swarm = new Swarm(self.infoHash, self.peerId, { dht: true })

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

Object.defineProperty(Torrent.prototype, 'progress', {
  get: function () {
    return 0 // TODO
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

  // Timeout for wire requests to this peer
  wire.setTimeout(WIRE_TIMEOUT)

  // Support extended messages:
  // - ut_metadata (metadata fetching, trackerless torrents)
  if (wire.peerExtensions.extended) {
    console.log(wire.remoteAddress, 'supports extended messages', wire.peerExtensions)

    var extendedMessage = {
      m: EXTENDED_MESSAGES
    }

    // Only send metadata_size if we have complete metadata
    if (self.metadata)
      extendedMessage.metadata_size = self.metadataRaw.length

    wire.extended(0, extendedMessage)
  }

  wire.on('extended', function (ext, buf) {
    console.log(wire.remoteAddress, 'extended', ext)

    if (ext === 0) // 0 = handshake
      self._onExtendedHandshake(wire, buf)
    else if (ext === EXTENDED_MESSAGES.ut_metadata)
      self._onUtMetadata(wire, buf)
  })
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
    var numPieces = Math.ceil(dict.metadata_size / METADATA_BLOCK_SIZE)
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
      data.copy(wire.metadata, dict.piece * METADATA_BLOCK_SIZE)

      self.metadataRaw = wire.metadata
      self.metadata = bncode.decode(wire.metadata)
      self.torrentFile = bncode.encode({
        'announce-list': [],
        infoHash: self.infoHash,
        info: self.metadata
      })

      self.onMetadata()
      break
    // ut_metadata reject (peer doesn't have piece we requested)
    // {'msg_type': 2, 'piece': 0}
    case 2:
      // TODO
      break
  }
}

Torrent.prototype.onMetadata = function () {
  var self = this

  var parsed
  try {
    parsed = parseTorrent(self.torrentFile)
  } catch (e) {
    console.error(e)
    return
  }
  console.log(parsed)
  // self.file = new Buffer(parsed)
}

//
// HELPER METHODS
//

/**
 * Given a magnet URI, return infoHash and title
 * @param  {string} uri
 * @return {Object}
 */
function parseMagnetUri (uri) {
  var parsed = magnet(uri)
  return {
    title: parsed.dn, // displayName
    infoHash: parsed.xt && parsed.xt.split('urn:btih:')[1]
  }
}
