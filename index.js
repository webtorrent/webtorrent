// var _log = console.log.bind(console)
// window.console.log = window.log = function () {
//   var args = [].slice.apply(arguments)
//   args = args.map(function (arg) {
//     if (!Array.isArray(arg) && typeof arg === 'object')
//       return JSON.stringify(arg)
//     else
//       return arg
//   })
//   var elem = document.getElementById('console')
//   elem.innerHTML += args.join(', ') + '<br>'
//   elem.scrollTop = elem.scrollHeight
//   _log.apply(null, args)
// }

// var _error = console.error.bind(console)
// window.console.error = function () {
//   var args = [].slice.apply(arguments)
//   var elem = document.getElementById('console')
//   elem.innerHTML += '<span style="color: red;">' + args.join(', ') + '</span><br>'
//   elem.scrollTop = elem.scrollHeight
//   _error.apply(null, args)
// }

var $ = require('jquery')
var async = require('async')
var bncode = require('bncode')
var DHT = require('bittorrent-dht')
var hat = require('hat')
var magnet = require('magnet-uri')
var portfinder = require('chrome-portfinder')
var Swarm = require('bittorrent-swarm')

var MAX_PEERS = 200
var WIRE_TIMEOUT = 10000
var METADATA_BLOCK_SIZE = 16 * 1024

var isChromeApp = !!(typeof window !== 'undefined' && window.chrome &&
    window.chrome.app && window.chrome.app.runtime)
if (isChromeApp)
  console.log('This is a chrome app.')

var peerId = '-WW0001-' + hat(48)

function magnetToInfoHash (uri) {
  try {
    return magnet(uri).xt.split('urn:btih:')[1]
  } catch (e) {
    return null
  }
}

function magnetToDisplayName (uri) {
  try {
    return magnet(uri).dn
  } catch (e) {
    return null
  }
}

var magnetUri = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&dn=Leaves+of+Grass+by+Walt+Whitman.epub'
var infoHash = magnetToInfoHash(magnetUri)
var displayName = magnetToDisplayName(magnetUri)

$('.infoHash span').text(infoHash)
$('.displayName span').text(displayName)

var dht
var swarm

async.auto({
  dhtPort: function (cb) {
    portfinder.getPort(cb)
  },
  swarmPort: function (cb) {
    portfinder.getPort(cb)
  },
  dht: ['dhtPort', function (cb, r) {
    dht = new DHT(infoHash)

    dht.on('node', function (node, infoHash) {
      var num = Number($('.dhtNodes span').text())
      $('.dhtNodes span').text(num + 1)
    })

    dht.on('peer', function (peer, infoHash) {
      var num = Number($('.dhtPeers span').text())
      $('.dhtPeers span').text(num + 1)
      // console.log('peer: ' + peer)

      swarm.add(peer)
    })

    dht.findPeers(MAX_PEERS) // TODO: should the DHT be concerned with max peers?

    // TODO: DHT should listen
    // dht.listen(r.dhtPort)
  }],
  swarm: ['swarmPort', function (cb, r) {
    swarm = new Swarm(infoHash, peerId, { dht: true })

    // TODO: add swarm listen and add ourselves to the DHT

    swarm.on('wire', function (wire) {
      $('.connectedPeers span').text(swarm.wires.length)

      // Send KEEP-ALIVE (every 60s) so peers will not disconnect the wire
      wire.setKeepAlive(true)

      // If peer supports DHT, send PORT message to report what port our DHT node
      // is listening on
      if (wire.peerExtensions.dht) {
        // TODO: DHT doesn't support listening yet
        // wire.port(dht.port)
      }

      // When peer sends PORT, add them to the routing table
      wire.on('port', function (port) {
        console.log('PORT', port)
        // TODO: DHT doesn't have a routing table
        // dht.add(wire.remoteAddress, port)
      })

      // Time to wait before considering requests timed out
      wire.setTimeout(WIRE_TIMEOUT)

      // Support extended messages:
      // - ut_metadata (metadata fetching, trackerless torrents)
      if (wire.peerExtensions) {
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
              suggestedName: displayName
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
      })

    })

    swarm.on('error', function (err) {
      console.error(err.message)
    })

    // swarm.listen(r.dhtPort, function () {
    //   console.log('Swarm listening on port ' + r.dhtPort)
    // })
  }]
}, function (err) {
  if (err) console.error(err.message)
  else console.log('Setup complete')
})

