module.exports = Torrent

var bncode = require('bncode')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var magnet = require('magnet-uri')
var Swarm = require('bittorrent-swarm')

var METADATA_BLOCK_SIZE = 16 * 1024
var WIRE_TIMEOUT = 10000

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
  if (wire.peerExtensions.dht)
    wire.port(self.dhtPort)

  // When peer sends PORT, add them to the routing table
  wire.on('port', function (port) {
    console.log('received PORT: ', port)
    // TODO: DHT doesn't have a routing table yet
    // dht.add(wire.remoteAddress, port)
  })

  // Timeout for wire requests to this peer
  wire.setTimeout(WIRE_TIMEOUT)

  // Support extended messages:
  // - ut_metadata (metadata fetching, trackerless torrents)
  if (wire.peerExtensions.extended) {
    console.log(wire.remoteAddress + ' supports extended messages', wire.peerExtensions)

    var extendedMessage = {
      m: {
        ut_metadata: 1
      }
    }

    // Only send metadata_size if we have complete metadata
    if (self.metadata)
      extendedMessage.metadata_size = self.metadata.length

    wire.extended(0, extendedMessage)
  }

  wire.on('extended', function (ext, buf) {
    var dict
    console.log('Received extended message ' + ext + ' from ' + wire.remoteAddress)

    if (ext === 0) { // handshake

      try {
        console.log('decoding ' + buf.toString())
        dict = bncode.decode(buf.toString())
        console.log('got extended handshake: ' + JSON.stringify(dict))
      } catch (e) {
        console.error('Error decoding extended message: ' + e.message)
      }

      if (dict.m.ut_metadata && dict.metadata_size) {
        var metadataSize = dict.metadata_size
        var numPieces = Math.ceil(metadataSize / METADATA_BLOCK_SIZE)
        console.log('metadata size: ' + metadataSize)
        console.log(numPieces + ' pieces')

        wire.metadata = new Buffer(metadataSize)

        // request all pieces
        for (var piece = 0; piece < numPieces; piece++) {
          wire.extended(dict.m.ut_metadata, {
            msg_type: 0,
            piece: piece
          })
        }
      }

    } else if (ext === 1) { // ut_metadata

      // 0 - request
      // 1 - data
      // 2 - reject

      var str
      var dataIndex
      var data
      try {
        str = buf.toString()
        console.log('decoding ' + str)
        dataIndex = str.indexOf('ee') + 2
        var msg = str.substring(0, dataIndex)
        console.log('using ' + msg)
        dict = bncode.decode(msg)
        data = buf.slice(dataIndex)
        console.log('got metadata: ' + JSON.stringify(dict))
        console.log('got metadata data: ' + data.length + ' bytes')
      } catch (e) {
        console.error('Error decoding extended message: ' + e.message)
      }

      // {'msg_type': 1, 'piece': 0, 'total_size': 3425}
      if (dict.msg_type === 1) { // data
        console.log('total_size: ' + dict.total_size)
        data.copy(wire.metadata, dict.piece * METADATA_BLOCK_SIZE)

        console.log('METADATA')
        console.log(wire.metadata.toString())
        self.metadata = {
          'announce-list': [],
          info: bncode.decode(wire.metadata),
          // info_hash:
        }
        console.log(self.metadata)
        self.emit('metadata', this.metadata)
      }
    }
  })
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
