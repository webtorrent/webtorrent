var isChromeApp = !!(window.chrome && chrome.app && chrome.app.runtime)

if (isChromeApp) {
  console.log('This is a Chrome App')
}

window.log = function (data) {
  document.getElementById('console').innerHTML += data + '<br>'
}
window.bops = require('bops')


var DHT = require('./lib/bittorrent-dht')
var leaves = 'D2474E86C95B19B8BCFDB92BC12C9D44667CFA36'

var dht = new DHT(leaves)
dht.on('node', function (node) {
  log('node: ' + node)
})
dht.on('peer', function (peer) {
  log('peer: ' + peer)
})
dht.findPeers(300)


// window.bops = require('bops')
// var benc  = require("bncode")
// var exmp = {}

// exmp.bla = "blup"
// exmp.foo = "bar"
// exmp.one = 1
// exmp.woah = {}
// exmp.woah.arr = []
// exmp.woah.arr.push(1)
// exmp.woah.arr.push(2)
// exmp.woah.arr.push(3)
// exmp.str = bops.from("Buffers work too")
// console.log(exmp)

// window.bencBuffer = benc.encode(exmp)
// console.log(bencBuffer)

// window.original = benc.decode(bencBuffer)
// console.log(original)



// Send UDP packet to echo server
// var string = require('./lib/string')
// var socket = require('./socket')

// var sock = new socket.UDPSocket()
// sock.on('bound', function(port) {
//   console.log('Bound to port: ' + port)
// })

// sock.on('data', function(data, host, port) {
//   console.log('Got data from host ' + host + ' port ' + port + ': ' + string.fromUTF8Arr(data))
// })

// sock.sendTo('lol', 'localhost', 50963)
