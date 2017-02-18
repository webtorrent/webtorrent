
module.exports = NatTraversal

var debug = require('debug')('webtorrent:nat-traversal')
var natUpnp = require('nat-upnp') // browser exclude

function NatTraversal () {
  var self = this

  debug('Create UPnP client')
  self._upnpClient = natUpnp.createClient()
  self.ttl = 60 * 30
  self.timeout = self.ttl - 60
  self.intervals = {}
}

NatTraversal.prototype.portMapping = function (port, cb) {
  var self = this

  debug('Mapping port %d on router using UPnP', port)
  self._upnpClient.portMapping({
    public: port,
    private: port,
    description: 'WebTorrent',
    ttl: self.ttl
  }, function (err) {
    if (err) {
      return typeof cb === 'function' && cb(err)
    }
    self.intervals[port] = setInterval(NatTraversal.prototype.portMapping.bind(self, port), self.timeout)
    debug('Port %d mapped on router using UPnP', port)
    if (typeof cb === 'function') cb()
  })
}

NatTraversal.prototype.portUnMapping = function (port, cb) {
  var self = this
  if (!self.intervals[port]) return typeof cb === 'function' && cb(new Error('Port not mapped'))

  debug('Unmapping port %d on router using UPnP', port)
  clearInterval(self.intervals[port])
  delete self.intervals[port]

  self._upnpClient.portUnmapping({
    public: port
  }, function (err) {
    if (err) {
      return typeof cb === 'function' && cb(err)
    }
    debug('Port %d unmapped on router using UPnP', port)
    if (typeof cb === 'function') cb()
  })
}

NatTraversal.prototype.destroy = function (cb) {
  var self = this

  // Clear all intervals
  Object.keys(self.intervals).forEach(function (port) {
    self.portUnMapping(port)
  })

  // Waiting next tick to prevent breaking some sockets
  process.nextTick(function () {
    self._upnpClient.close()
    debug('UPnP client closed')
    cb()
  })
}
