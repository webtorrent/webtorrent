module.exports = TorrentManager

var $ = require('jquery')
var DHT = require('bittorrent-dht')
var EventEmitter = require('events').EventEmitter
var hat = require('hat')
var inherits = require('inherits')
var Torrent = require('./Torrent')

var MAX_PEERS = 200

inherits(TorrentManager, EventEmitter)

function TorrentManager () {
  if (!(this instanceof TorrentManager)) return new TorrentManager()
  EventEmitter.call(this)

  // TODO: should these ids be consistent between restarts?
  this.peerId = new Buffer('-WW0001-' + hat(48), 'utf8')
  this.nodeId = new Buffer(hat(160), 'hex')

  this.torrents = {}

  this.dht = new DHT({ nodeId: this.nodeId })

  this.dht.on('node', this.updateUI.bind(this))
  this.dht.on('peer', this.updateUI.bind(this))

  this.dht.on('peer', function (addr, infoHash) {
    var torrent = this.torrents[infoHash]
    torrent.addPeer(addr)
  }.bind(this))

  // this.dht.listen()

}

TorrentManager.prototype.add = function (uri) {
  var torrent = new Torrent(uri, { peerId: this.peerId })
  this.torrents[torrent.infoHash] = torrent

  torrent.on('listening', function (port) {
    // TODO: Add the torrent to the public DHT so peers know to find up
  })

  // TODO: DHT should support multiple infoHashes
  this.dht.setInfoHash(torrent.infoHash)
  this.dht.findPeers(MAX_PEERS) // TODO: should the DHT be concerned with max peers?

  this.updateUI()
}

// TODO: show multiple torrents
TorrentManager.prototype.updateUI = function () {
  // console.log('Peer ID: ' + this.peerId.toString('utf8'))
  // console.log('Node ID: ' + this.nodeId.toString('hex'))
  $('.infoHash span').text(this.torrents['d2474e86c95b19b8bcfdb92bc12c9d44667cfa36'].infoHash)
  $('.displayName span').text(this.torrents['d2474e86c95b19b8bcfdb92bc12c9d44667cfa36'].displayName)

  $('.dhtNodes span').text(Object.keys(this.dht.nodes).length)
  $('.dhtPeers span').text(Object.keys(this.dht.peers).length)
}

