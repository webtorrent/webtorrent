exports.UDPSocket = UDPSocket
// exports.TCPSocket = TCPSocket

var EventEmitter = require('events').EventEmitter
var string = require('./lib/string')
var util = require('util')

util.inherits(UDPSocket, EventEmitter)

function UDPSocket () {
  var self = this
  if (!(self instanceof UDPSocket)) return new UDPSocket()

  EventEmitter.call(self)

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
    if (recvFromInfo.resultCode <= 0) {
      console.warn('UDPSocket ' + self.id + ' recvFrom: ', recvFromInfo)
    } else {
      self.emit('data', new Uint8Array(recvFromInfo.data),
          recvFromInfo.address, recvFromInfo.port)
      self._recvLoop()
    }
  })
}