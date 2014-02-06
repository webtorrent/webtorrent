module.exports = TorrentManager

var $ = require('jquery')
var async = require('async')
var DHT = require('bittorrent-dht')
var EventEmitter = require('events').EventEmitter
var hat = require('hat')
var inherits = require('inherits')
var portfinder = require('chrome-portfinder')
var Torrent = require('./Torrent')

var MAX_PEERS = 200
portfinder.basePort = Math.floor(Math.random() * 60000) + 1025 // >1024

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

  this.ready = false

  async.auto({
    dhtPort: function (cb) {
      portfinder.getPort(cb)
    },
    torrentPort: function (cb) {
      portfinder.getPort(cb)
    }
  }, function (err, r) {
    this.dhtPort = r.dhtPort
    this.torrentPort = r.torrentPort

    this.dht.listen(this.dhtPort, function () {
      this.ready = true
      this.emit('ready')
    }.bind(this))
  }.bind(this))
}

TorrentManager.prototype.add = function (uri) {
  if (!this.ready)
    return this.once('ready', this.add.bind(this, uri))

  var torrent = new Torrent(uri, {
    peerId: this.peerId,
    port: this.torrentPort
  })
  this.torrents[torrent.infoHash] = torrent

  torrent.on('listening', function (port) {
    console.log('Swarm listening on port ' + port)
    // TODO: Add the torrent to the public DHT so peers know to find up
  })

  torrent.on('metadata', this.updateUI.bind(this))

  this.dht.setInfoHash(torrent.infoHash)
  this.dht.findPeers(MAX_PEERS) // TODO: should the DHT be concerned with max peers?

  this.updateUI()

  var t = this.torrents['d2474e86c95b19b8bcfdb92bc12c9d44667cfa36']
  $('.downloadMetadata').click(function () {
    t.downloadMetadata()
  })
}

// TODO: show multiple torrents
TorrentManager.prototype.updateUI = function () {
  // console.log('Peer ID: ' + this.peerId.toString('utf8'))
  // console.log('Node ID: ' + this.nodeId.toString('hex'))

  var t = this.torrents['d2474e86c95b19b8bcfdb92bc12c9d44667cfa36']

  $('.infoHash span').text(t.infoHash)
  $('.displayName span').text(t.displayName)

  $('.dhtNodes span').text(Object.keys(this.dht.nodes).length)
  $('.dhtPeers span').text(Object.keys(this.dht.peers).length)

  var connectedPeers = 0
  for (var infoHash in this.torrents) {
    var torrent = this.torrents[infoHash]
    connectedPeers += torrent.numPeers
  }
  $('.connectedPeers span').text(connectedPeers)
  $('.downloadMetadata').toggleClass('highlight', !!t.metadata)
}

