window.log = function (data) {
  var elem = document.getElementById('console')
  elem.innerHTML += data + '<br>'
  elem.scrollTop = elem.scrollHeight
}

var $ = require('jquery')
var DHT = require('bittorrent-dht')
var hat = require('hat')
var magnet = require('magnet-uri')
var Swarm = require('bittorrent-swarm')

var MAX_PEERS = 60
var METADATA_BLOCK_SIZE = 16 * 1024

var isChromeApp = !!(typeof window !== 'undefined' && window.chrome &&
    window.chrome.app && window.chrome.app.runtime)
if (isChromeApp)
  console.log('This is a Chrome App')

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

var dht = new DHT(infoHash)
dht.findPeers(MAX_PEERS)

var swarm = new Swarm(infoHash, peerId)

dht.on('node', function (node, infoHash) {
  var num = Number($('.dhtNodes span').text())
  $('.dhtNodes span').text(num + 1)
})
dht.on('peer', function (peer, infoHash) {
  var num = Number($('.dhtPeers span').text())
  $('.dhtPeers span').text(num + 1)

  log('peer: ' + peer)
  swarm.add(peer)
})

