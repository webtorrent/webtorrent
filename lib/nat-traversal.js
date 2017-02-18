var arrayRemove = require('unordered-array-remove')
var debug = require('debug')('webtorrent:nat-traversal')
var natUpnp = require('nat-upnp') // browser exclude
var natpmp = require('nat-pmp') // browser exclude
var network = require('network') // browser exclude

// Use single instance
module.exports = new NatTraversal()

function NatTraversal () {
  var self = this
  self._destroyed = false

  // The RECOMMENDED Port Mapping Lifetime is 7200 seconds (two hours).
  self.ttl = 7200
  // Refresh the mapping 10 minutes before the end of its lifetime
  self.timeout = (self.ttl - 600) * 1000
  self._openedPorts = []
  self._intervalsUpnp = {}
  self._intervalsPmp = {}

  self._upnpPortMapping = function (port, cb) {
    var self = this

    debug('Mapping port %d on router using UPnP', port)
    self._upnpClient.portMapping({
      public: port,
      private: port,
      description: 'WebTorrent',
      ttl: self.ttl
    }, function (err) {
      if (self._destroyed) return typeof cb === 'function' && cb()
      if (err) {
        return typeof cb === 'function' && cb(err)
      }
      self._intervalsUpnp[port] = setInterval(self._pmpPortMapping.bind(self, port), self.timeout)
      debug('Port %d mapped on router using UPnP', port)
      if (typeof cb === 'function') cb()
    })
  }

  self._pmpPortMapping = function (port, cb) {
    var self = this

    debug('Mapping port %d on router using NAT-PMP', port)
    self._pmpClient.portMapping({
      private: port,
      public: port,
      ttl: self.ttl,
      type: 'tcp'
    }, function (err/* , info */) {
      if (self._destroyed) return typeof cb === 'function' && cb()
      if (err) {
        debug('Error mapping port %d using NAT-PMP', port, err)
        return typeof cb === 'function' && cb(err)
      }
      self._intervalsPmp[port] = setInterval(self._pmpPortMapping.bind(self, port), self.timeout)
      debug('Port %d mapped on router using NAT-PMP', port)
      if (typeof cb === 'function') cb()
    })
  }

  debug('UPnP client creation')
  self._upnpClient = natUpnp.createClient()

  // Lookup gateway IP
  debug('Lookup gateway IP')
  network.get_gateway_ip(function (err, ip) {
    if (self._destroyed) return
    if (err) {
      return debug('Could not find gateway IP for NAT-PMP', err)
    }
    debug('NAT-PMP client creation', ip)
    self._pmpClient = natpmp.connect(ip)
    self._openedPorts.forEach(function (port) {
      self._pmpPortMapping(port)
    })
  })
}

NatTraversal.prototype.portMapping = function (port, cb) {
  var self = this
  if (self._destroyed) return typeof cd === 'function' && cb()

  self._openedPorts.push(port)

  // Try UPnP first
  self._upnpPortMapping(port, function (err) {
    if (self._destroyed) return typeof cb === 'function' && cb()
    if (err) {
      debug('UPnP port mapping failed on %d', port, err.message)
    }

    // Then NAT-PMP
    if (self._pmpClient) {
      self._pmpPortMapping(port, cb)
    } else if (typeof cb === 'function') {
      cb()
    }
  })
}

NatTraversal.prototype.portUnMapping = function (port, cb) {
  var self = this
  if (self._destroyed) return typeof cd === 'function' && cb()
  arrayRemove(self._openedPorts, self._openedPorts.indexOf(port))

  // Clear intervals
  if (self._intervalsUpnp[port]) {
    clearInterval(self._intervalsUpnp[port])
    delete self._intervalsUpnp[port]
  }
  if (self._intervalsPmp[port]) {
    clearInterval(self._intervalsPmp[port])
    delete self._intervalsPmp[port]
  }

  debug('Unmapping port %d on router using UPnP', port)
  self._upnpClient.portUnmapping({
    public: port
  }, function (err) {
    if (!err) debug('Port %d unmapped on router using UPnP', port)
    if (self._pmpClient) {
      debug('Unmapping port %d on router using NAT-PMP', port)
      self._pmpClient.portUnmapping({
        private: port,
        public: port
      }, cb)
    } else {
      if (typeof cb === 'function') cb()
    }
  })
}

NatTraversal.prototype.destroy = function (cb) {
  var self = this
  if (self._destroyed) return cb()

  // Unmap all ports
  self._openedPorts.forEach(function (port) {
    self.portUnMapping(port)
  })
  self._destroyed = true

  if (self._pmpClient) {
    debug('Close pmp client')
    self._pmpClient.close()
  }

  // Waiting next tick to prevent breaking some sockets
  process.nextTick(function () {
    debug('Close UPnP client')
    self._upnpClient.close()
    cb()
  })
}
