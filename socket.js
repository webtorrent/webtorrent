exports.UDPSocket = UDPSocket
exports.TCPSocket = TCPSocket
exports.TCPListenSocket = TCPListenSocket

var EventEmitter = require('events').EventEmitter
var util = require('util')
var bops = require('bops')

function toBuffer (data) {
  if (typeof data === 'string') {
    data = bops.from(data)
  } else if (bops.is(data)) {
    // If data is an TypedArrayView (Uint8Array) then copy the buffer, so the
    // underlying buffer will be exactly the right size. We care about this
    // because the Chrome `sendTo` function takes an ArrayBuffer.
    var newBuf = bops.create(data.length)
    bops.copy(data, newBuf, 0, 0, data.length)
    data = newBuf
  }

  // `socket.sendTo` requires an ArrayBuffer
  if (data.buffer) {
    data = data.buffer
  }
  return data
}

util.inherits(UDPSocket, EventEmitter)

function UDPSocket () {
  var self = this
  if (!(self instanceof UDPSocket)) return new UDPSocket()

  EventEmitter.call(self)

  self.sendBuffer = []
  self._create()
}

UDPSocket.prototype._create = function () {
  var self = this
  self.sendBuffer = []
  self.localPort = 0
  self.bound = false

  chrome.socket.create('udp', {}, function (createInfo) {
    self.id = createInfo.socketId

    chrome.socket.bind(self.id, '0.0.0.0', 0, function (result) {
      if (result < 0) {
        console.warn('UDPSocket ' + self.id + ' failed to bind')
        return
      }
      chrome.socket.getInfo(self.id, function (result) {
        if (!result.localPort) {
          console.warn('Cannot get local port for UDPSocket ' + self.id)
          return
        }
        self.localPort = result.localPort
        self._onBound()
      })
    })
  })
}

UDPSocket.prototype._onBound = function () {
  var self = this

  self.bound = true
  self.emit('bound', self.localPort)
  while (self.sendBuffer.length) {
    var message = self.sendBuffer.shift()
    self.sendTo(message.data, message.host, message.port, message.cb)
  }

  self._recvLoop()
}

UDPSocket.prototype.sendTo = function (data, host, port, cb) {
  var self = this
  cb || (cb = function () {})

  if (!self.bound) {
    self.sendBuffer.push({'data': data, 'host': host, 'port': port, 'cb': cb})
    return
  }

  data = toBuffer(data)

  chrome.socket.sendTo(self.id, data, host, port, function (writeInfo) {
    if (writeInfo.bytesWritten < 0) {
      console.warn('UDPSocket ' + self.id + ' write: ' + writeInfo.bytesWritten)
      cb(new Error('writeInfo.bytesWritten: ' + writeInfo.bytesWritten))
    } else {
      cb(null)
    }
  })
}

UDPSocket.prototype._recvLoop = function() {
  var self = this

  chrome.socket.recvFrom(self.id, function (recvFromInfo) {
    if (recvFromInfo.resultCode == 0) {
      self.emit('disconnect')
    } else if (recvFromInfo.resultCode < 0) {
      console.warn('UDPSocket ' + self.id + ' recvFrom: ' +
                   recvFromInfo.resultCode)
      self.emit('error', 'read')
    } else {
      self.emit('data', new Uint8Array(recvFromInfo.data),
          recvFromInfo.address, recvFromInfo.port)
      self._recvLoop()
    }
  })
}

util.inherits(TCPSocket, EventEmitter)

// Represents a TCP socket that can pass data
function TCPSocket (host, port) {
  var self = this

  self.sendBuffer = []
  self.host = host
  self.port = port
  self.isServer = (typeof self.id !== 'undefined')

  if (!self.isServer)
    self.connected = false

  EventEmitter.call(self)
  self._create()
}

TCPSocket.prototype._create = function() {
  var self = this
  chrome.socket.create('tcp', {}, function (createInfo) {
    self.id = createInfo.socketId

    self._onCreated()
  })
}

TCPSocket.prototype._onCreated = function() {
  var self = this
  console.log(self.id + ' ' + self.host + ':' + self.port)
  chrome.socket.connect(self.id, self.host, self.port, function (result) {
    if (result < 0) {
      console.warn('TCPSocket ' + self.id + ' failed to connect: ' + result)
      // self.emit('error', 'connect')
      return
    }
    self._onConnected()
  })
}

TCPSocket.prototype._onConnected = function () {
  var self = this

  self.connected = true
  self.emit('connected')
  while (self.sendBuffer.length) {
    var message = self.sendBuffer.shift()
    self.write(message.data, message.cb)
  }

  self._recvLoop()
}

TCPSocket.prototype.write = function (data, cb) {
  var self = this
  cb || (cb = function () {})

  if (!self.connected) {
    self.sendBuffer.push({'data': data, 'cb': cb})
    return
  }

  data = toBuffer(data)

  chrome.socket.write(self.id, data, function (writeInfo) {
    if (writeInfo.bytesWritten < 0) {
      console.warn('TCPSocket ' + self.id + ' write: ' + writeInfo.bytesWritten)
      cb(new Error('writeInfo.bytesWritten: ' + writeInfo.bytesWritten))
      self.emit('error', 'write')
    } else {
      cb(null)
    }
  })
}

TCPSocket.prototype._recvLoop = function() {
  var self = this

  chrome.socket.read(self.id, function (readInfo) {
    if (readInfo.resultCode == 0) {
      self.emit('disconnect')
    } else if (readInfo.resultCode < 0) {
      console.warn('TCPSocket ' + self.id + ' recvFrom: ', readInfo.resultCode)
      self.emit('error', 'read')
    } else {
      self.emit('data', new Uint8Array(readInfo.data))
      self._recvLoop()
    }
  })
}

util.inherits(TCPListenSocket, EventEmitter)

function TCPListenSocket (port) {
  var self = this
  if (!(self instanceof TCPListenSocket)) return new TCPListenSocket() 

  self.port = port
  EventEmitter.call(self)
  self._create()
}

TCPListenSocket.prototype._create = function() {
  var self = this
  chrome.socket.create('tcp', {}, function (createInfo) {
    self.id = createInfo.socketId

    self._onCreated()
  })
}

TCPListenSocket.prototype._onCreated = function () {
  var self = this

  self.bound = true
  self.emit('bound')

  chrome.socket.listen(self.id, '0.0.0.0', self.port, function (result) {
    if (result < 0) {
      console.warn('TCPSocket ' + self.id + ' failed to listen')
      return
    }
    chrome.socket.accept(self.id, function (acceptInfo) {
      if (acceptInfo.resultCode < 0) {
        console.warn('TCPSocket ' + self.id + ' failed to accept')
        return
      }

      chrome.socket.getInfo(acceptInfo.socketId, function (result) {
        var connectedSocket = new TCPServerSocket(acceptInfo.socketId,
                                                  result.peerAddress,
                                                  result.peerPort)
        self.emit('connected', connectedSocket)
      })
    })
  })
}

util.inherits(TCPServerSocket, TCPSocket)

// Internal class for different server-side behavior
function TCPServerSocket (id, peerAddress, peerPort) {
  var self = this

  self.id = id
  TCPSocket.call(self, peerAddress, peerPort)
}

TCPServerSocket.prototype._create = function () {
  var self = this
  self._onConnected()
}
