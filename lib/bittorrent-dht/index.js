module.exports = DHT

var EventEmitter = require('events').EventEmitter
var is = require('core-util-is') // added in Node 0.12

// TODO?
var bncode = require('bncode')
var crypto = require('crypto')
var bagpipe = require('bagpipe')
var fs = require('fs')
var compact2string = require('compact2string')

var CONNECTION_TIMEOUT = 10000
var HANDSHAKE_TIMEOUT = 5000
var RECONNECT = 5000
var MAX_NODES = 5000
var MAX_PARALLEL = 10
var BOOTSTRAP_NODES = [
	'dht.transmissionbt.com:6881',
	'router.bittorrent.com:6881',
	'router.utorrent.com:6881'
]

var randomId = function() {
	var bytes = crypto.randomBytes(2000)
	var offset = 0
	return function() {
		var id = bytes.slice(offset, offset + 20)
		offset = (offset + 20) % bytes.length
		return id
	}
}()

var parseNodeInfo = function(compact) {
	try {
		var nodes = []
		for (var i = 0; i < compact.length; i += 26) {
			nodes.push(compact2string(compact.slice(i+20, i+26)))
		}
		return nodes
	} catch(err) {
		return []
	}
}

var parsePeerInfo = function(list) {
	try {
		return list.map(compact2string)
	} catch (err) {
		return []
	}
}

var socket,	requestId = 0, initialNodes = [], pendingRequests = { }

/**
 * Create a new DHT
 * @param {string|Buffer} infoHash
 */
function DHT (infoHash) {
  var self = this
	EventEmitter.call(self)

  if (is.isString(infoHash)) {
    infoHash = new Buffer(infoHash, 'hex')
  } else if (!is.isBuffer(infoHash)) {
    throw new Error('DHT() requires string or buffer infoHash')
  }

	var node = function(addr) {
		initialNodes.push(addr)
		if (self.nodes[addr]) return
		if (self.missing) return self.query(addr)
		if (self.queue.length < 50) self.queue.push(addr)
	}
	var peer = function(addr) {
		if (self.peers[addr]) return
		self.peers[addr] = true
		self.missing = Math.max(0, self.missing-1)
		process.nextTick(function() { self.emit('peer', addr) }) // if the query is satisfied now, the socket must be closed before a new query is started
	}

	this.nodes = {}
	this.peers = {}
	//this.queue = [].concat(BOOTSTRAP_NODES)
	this.queue = initialNodes.length ? [].concat(initialNodes.slice( initialNodes.length - MAX_PARALLEL )) : [].concat(BOOTSTRAP_NODES)
	//this.queue = initialNodes.length ? [].concat(initialNodes/*.slice( initialNodes.length - 10 )*/) : [].concat(BOOTSTRAP_NODES)
	this.nodesCount = 0
	this.missing = 0
	this.infoHash = infoHash
	this.nodeId = randomId()
	this.requestId = ++requestId
	this.message = bncode.encode({t:this.requestId.toString(),y:'q',q:'get_peers',a:{id:this.nodeId,info_hash:this.infoHash}})
	this.parallelLimit = new bagpipe(MAX_PARALLEL)

    pendingRequests[self.requestId] = 1

    this.stop = function()
    {
        delete pendingRequests[self.requestId]
        if (Object.keys(pendingRequests).length) return
        self.socket && self.socket.close()
        self.socket = socket = null
    }

	this.socket = socket = socket || dgram.createSocket('udp4')
	this.socket.on('message', function(message, remote) {
		self.nodes[remote.address+':'+remote.port] = true

		try {
			message = bncode.decode(message)
		} catch (err) {
			return
		}

		if (! (message.t.toString() == self.requestId))
			return

		var r = message && message.r
		var nodes = r && r.nodes || []
		var values = r && r.values || []

		parsePeerInfo(values).forEach(peer)
		parseNodeInfo(nodes).forEach(node)

		if (! self.missing) self.stop()
	})
}

DHT.prototype.__proto__ = EventEmitter.prototype

DHT.prototype.query = function(addr) {
	if (Object.keys(this.nodes).length > MAX_NODES) return
  console.log(addr)

	var self = this,
		sendMessage = function(cb) { self.socket && self.socket.send(self.message, 0, self.message.length, addr.split(':')[1], addr.split(':')[0], cb) }
	this.parallelLimit.push(sendMessage, function() { })
}

DHT.prototype.findPeers = function(num, timeout) {
	this.missing += (num || 1)
	while (this.queue.length) this.query(this.queue.pop())
	timeout && setTimeout(this.stop, timeout)
}

DHT.prototype.close = function() {
	this.socket.close()
}

DHT.prototype.__defineGetter__('peersFound', function() { return Object.keys(this.peers).length })
DHT.prototype.__defineGetter__('nodesFound', function() { return Object.keys(this.nodes).length })
DHT.prototype.__defineGetter__('queued', function() { return 0 }) //TODO
