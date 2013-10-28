// window.log = function (data) {
//   document.getElementById('console').innerHTML += data + '<br>'
// }
window.log = function (/* ... */) {
  if (process.env.DEBUG !== 'false') console.log.apply(console, arguments)
}

var isChromeApp = !!(window.chrome && chrome.app && chrome.app.runtime)
if (isChromeApp) {
  log('This is a Chrome App')
}

window.bops = require('bops')

var magnet = require('magnet-uri')

var DHT = require('./lib/bittorrent-dht')
var pride = '1E69917FBAA2C767BCA463A96B5572785C6D8A12'
var leaves = 'D2474E86C95B19B8BCFDB92BC12C9D44667CFA36'

var leavesMagnet = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&dn=Leaves+of+Grass+by+Walt+Whitman.epub&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337'

console.log(magnet(leavesMagnet))

window.dht = new DHT(pride)
dht.on('node', function (node, infoHash) {
  // log('node: ' + node)
})
dht.on('peer', function (peer, infoHash) {
  log('peer: ' + peer)
})
dht.findPeers(300)


// var compact2string = require("compact2string");

// var ipports = compact2string.multi(bops.from("0A0A0A05008064383a636f6d", "hex"))
// console.log(ipports);


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
