exports.UDPSocket = UDPSocket
// exports.TCPSocket = TCPSocket

var EventEmitter = require('events').EventEmitter
var string = require('./lib/string')
var util = require('util')

util.inherits(BaseSocket, EventEmitter)

function BaseSocket (host, port) {
  var self = this
  self.host = host
  self.port = port

  self.paused = true
  self.readPending = false

  EventEmitter.call(self)
}

BaseSocket.prototype.connect = function (cb) {
  var self = this
  self._create(function (err, id) {
    if (err) return cb(err)
    self.id = id
    chrome.socket.connect(self.id, self.host, self.port, function (res) {
      if (res === 0) cb(null)
      else cb(new Error('Unexpected connect result:' + res))
    })
  })
}

BaseSocket.prototype.end = function () {
  var self = this
  if (!self.id) return
  chrome.socket.destroy(self.id)
  self.id = null // mark socket as destroyed
}

BaseSocket.prototype.getInfo = function (cb) {
  var self = this
  chrome.socket.getInfo(self.id, cb)
}

BaseSocket.prototype.pause = function () {
  var self = this
  self.paused = true
}

BaseSocket.prototype.resume = function () {
  var self = this
  self.paused = false
  self.read()
}

BaseSocket.prototype.read = function (readLength) {
  var self = self
  if (self.paused || self.readPending) return
  self.readPending = true

  chrome.socket.read(self.id, readLength, function (readInfo) {
    self.readPending = false
    if (readInfo.resultCode < 0) return self.end()

    if (readInfo.data) {
      self.emit('data', readInfo.data)
      try {
        // only read if not closed
        if (self.id) self.read()
      } catch (e) {
        self.emit('error', e.stack || e.message || e)
        self.end()
      }
    }
  })
}


util.inherits(UDPSocket, BaseSocket)

function UDPSocket (host, port) {
  var self = this
  if (!(self instanceof UDPSocket)) return new UDPSocket(host, port)

  BaseSocket.call(self, host, port)
}

UDPSocket.prototype._create = function (cb) {
  var self = this
  chrome.socket.create('udp', {}, function (createInfo) {
    cb(null, createInfo.socketId)
  })
}

UDPSocket.prototype.write = function (data) {
  var self = this
  if (!self.id) return

  if (typeof data === 'string') {
    data = string.toUTF8Arr(data).buffer
  } else if (data.buffer) {
    data = data.buffer
  }

  chrome.socket.write(self.id, data, function (writeInfo) {
    if (writeInfo.bytesWritten < 0) {
      console.warn('UDPSocket ' + self.id + ' write: ' + writeInfo.bytesWritten)
      return self.end()
    }
  })
}

UDPSocket.prototype.recvLoop = function() {
  var self = this

  chrome.socket.recvFrom(self.id, function (recvFromInfo) {
    if (recvFromInfo.resultCode > 0) {
      self.emit('data', recvFromInfo.data, recvFromInfo.address,
          recvFromInfo.port)
      self.recvLoop()
    } else {
      console.warn('UDPSocket ' + self.id + ' recvFrom: ', recvFromInfo)
    }
  })
}
