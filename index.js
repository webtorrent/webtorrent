/* global chrome */

// window.log = function (data) {
//   document.getElementById('console').innerHTML += data + '<br>'
// }
// window.log = function (/* ... */) {
//   if (process.env.DEBUG !== 'false') console.log.apply(console, arguments)
// }

var Protocol = require('bittorrent-protocol')
var DHT = require('bittorrent-dht')
var hat = require('hat')
var magnet = require('magnet-uri')
var net = require('net')
var Swarm = require('bittorrent-swarm')

var isChromeApp = !!(typeof window !== 'undefined' && window.chrome &&
    chrome.app && chrome.app.runtime)
if (isChromeApp) {
  console.log('This is a Chrome App')
}

var peerId = '-WW0001-' + hat(48)

// var pride = '1E69917FBAA2C767BCA463A96B5572785C6D8A12'
// var leaves = 'D2474E86C95B19B8BCFDB92BC12C9D44667CFA36'

var leavesMagnet = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&dn=Leaves+of+Grass+by+Walt+Whitman.epub&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337'

var infoHash
try {
  infoHash = magnet(leavesMagnet).xt.split('urn:btih:')[1]
} catch (e) {}


var dht = window.dht = new DHT(infoHash)
var swarm = new Swarm(infoHash, peerId)

dht.on('node', function (node, infoHash) {
  // console.log('node: ' + node)
})
dht.on('peer', function (peer, infoHash) {
  console.log('peer: ' + peer)
  swarm.add(peer)

  var parts = peer.split(':')
  var conn = net.connect(parts[1], parts[0])

  var wire = Protocol()

  conn.on('end', function() {
    conn.destroy()
  })
  conn.on('error', function() {
    conn.destroy()
  })
  conn.on('close', function() {
    wire.end()
  })

  wire.once('handshake', function(infoHash2, peerId, extensions) {
    console.log('HANDSHAKE SUCCESS')
    if (infoHash2.toString('hex') !== infoHash.toString('hex')) return conn.destroy()
  })

  conn.pipe(wire).pipe(conn)

  wire.on('end', function() {
    console.log('WIRE END')
  })

  wire.remoteAddress = peer
  wire.handshake(infoHash, peerId)
})

dht.findPeers(300)

var METADATA_BLOCK_SIZE = 1024*16
