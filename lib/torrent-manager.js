module.exports = TorrentManager

var $ = require('jquery')
var async = require('async')
var DHT = require('bittorrent-dht')
var EventEmitter = require('events').EventEmitter
var hat = require('hat')
var inherits = require('inherits')
var portfinder = require('chrome-portfinder')
var speedometer = require('speedometer')
var Torrent = require('./torrent')

var MAX_PEERS = 200
portfinder.basePort = Math.floor(Math.random() * 60000) + 1025 // >1024

inherits(TorrentManager, EventEmitter)

function TorrentManager () {
  var self = this
  if (!(self instanceof TorrentManager)) return new TorrentManager()
  EventEmitter.call(self)

  // TODO: should these ids be consistent between restarts?
  self.peerId = new Buffer('-WW0001-' + hat(48), 'utf8')
  self.nodeId = new Buffer(hat(160), 'hex')

  self.torrents = []
  self.ready = false
  this.downloadSpeed = speedometer()
  this.uploadSpeed = speedometer()

  self.dht = new DHT({ nodeId: self.nodeId })

  // self._reemitEvents(self.dht, 'dht', ['node', 'peer'])

  self.dht.on('peer', function (addr, infoHash) {
    var torrent = self.getTorrent(infoHash)
    torrent.addPeer(addr)
  })


  self._installWindowEvents()

  async.auto({
    dhtPort: function (cb) {
      portfinder.getPort(cb)
    },
    torrentPort: function (cb) {
      portfinder.getPort(cb)
    }
  }, function (err, r) {
    self.dhtPort = r.dhtPort
    self.torrentPort = r.torrentPort

    self.dht.listen(self.dhtPort, function () {
      self.ready = true
      self.emit('ready')
    })
  })
}

Object.defineProperty(TorrentManager.prototype, 'ratio', {
  get: function () {
    var self = this

    var uploaded = self.torrents.reduce(function (total, torrent) {
      return total + torrent.uploaded
    }, 0)
    var downloaded = self.torrents.reduce(function (total, torrent) {
      return total + torrent.downloaded
    }, 0)

    if (downloaded === 0) return 0
    return uploaded / downloaded
  }
})

TorrentManager.prototype.getTorrent = function (infoHash) {
  var self = this
  var index
  for (var i = 0, len = self.torrents.length; i < len; i += 1) {
    var torrent = self.torrents[i]
    if (torrent.infoHash === infoHash)
      return torrent
  }
  return null
}

/**
 * Add a torrent via magnet uri or torrent file
 * @param {string|Buffer} uri   magnet uri or torrent file
 */
TorrentManager.prototype.addTorrent = function (uri) {
  var self = this
  if (!self.ready)
    return self.once('ready', self.addTorrent.bind(self, uri))

  var torrent = new Torrent(uri, {
    peerId: self.peerId,
    torrentPort: self.torrentPort,
    dhtPort: self.dhtPort
  })
  self.torrents.push(torrent)

  torrent.swarm.on('download', function (downloaded) {
    self.downloadSpeed(downloaded)
  })
  torrent.swarm.on('upload', function (uploaded) {
    self.uploadSpeed(uploaded)
  })

  // self._reemitEvents(torrent, 'torrent', ['listening'])
  self.emit('addTorrent', torrent)

  torrent.on('listening', function (port) {
    console.log('Swarm listening on port ' + port)
    // TODO: Add the torrent to the public DHT so peers know to find up
  })

  torrent.on('error', function (err) {
    self.emit('error', err)
  })

  self.dht.setInfoHash(torrent.infoHash)
  self.dht.findPeers(MAX_PEERS) // TODO: should the DHT be concerned with max peers?
}

TorrentManager.prototype._reemitEvents = function (obj, eventPrefix, events) {
  var self = this
  events.forEach(function (event) {
    obj.on(event, function () {
      var args = Array.prototype.slice.call(arguments)
      args.unshift(eventPrefix + ':' + event, obj)
      self.emit.apply(self, args)
    })
  })
}
