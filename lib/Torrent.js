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
  if (!(this instanceof Torrent)) return new Torrent(uri, opts)
  EventEmitter.call(this)

  var info = this._parseMagnetUri(uri)
  if (!info.infoHash)
    throw new Error('invalid torrent uri')

  this.infoHash = info.infoHash
  this.displayName = info.displayName

  this.swarm = new Swarm(this.infoHash, opts.peerId, { dht: true })

  // TODO: swarm pooling should be smart about picking port
  // this.swarm.listen(function (port) {
  //   console.log('Swarm listening on port ' + port)
  //   this.emit('listening', port)
  // }.bind(this))

  this.swarm.on('wire', function (wire) {
    $('.connectedPeers span').text(this.swarm.wires.length)

    // Send KEEP-ALIVE (every 60s) so peers will not disconnect the wire
    wire.setKeepAlive(true)

    // If peer supports DHT, send PORT message to report what port our DHT node
    // is listening on
    if (wire.peerExtensions.dht) {
      console.log('peer supports DHT')
      // TODO: DHT doesn't support listening yet
      // wire.port(dht.port)
    }

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
      console.log('Wire ' + wire.remoteAddress + ' supports extended messages', wire.peerExtensions)
      wire.extended(0, {
        m: {
          ut_metadata: 1
        }
        // TODO - this should be set once we have metadata
        // metadata_size: xx
      })
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

          var errorHandler = function (err) {
            console.error('error' + err.toString())
          }

          chrome.fileSystem.chooseEntry({
            type: 'saveFile',
            suggestedName: this.displayName + '.torrent'
          }, function (writableFileEntry) {
            writableFileEntry.createWriter(function (writer) {
              writer.onerror = errorHandler
              writer.onwriteend = function (e) {
                console.log('write complete')
              }
              writer.write(new Blob([wire.metadata]), { type: 'text/plain' })
            }, errorHandler)
          })
        }
      }
    }.bind(this))

  }.bind(this))

  this.swarm.on('error', function (err) {
    console.error(err.message)
  })
}

/**
 * Add a peer to the swarm
 * @param {string} addr
 */
Torrent.prototype.addPeer = function (addr) {
  this.swarm.add(addr)
}

//
// HELPER METHODS
//

/**
 * Given a magnet URI, return infoHash and displayName
 * @param  {string} uri
 * @return {Object}
 */
Torrent.prototype._parseMagnetUri = function (uri) {
  var parsed = magnet(uri)
  return {
    displayName: parsed.dn,
    infoHash: parsed.xt && parsed.xt.split('urn:btih:')[1]
  }
}
