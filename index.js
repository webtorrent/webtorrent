var isChromeApp = !!(window.chrome && chrome.app && chrome.app.runtime)

if (isChromeApp) {
  console.log('This is a Chrome App')
}


var DHT = require('./lib/bittorrent-dht')
var leaves = 'D2474E86C95B19B8BCFDB92BC12C9D44667CFA36'

var dht = new DHT(leaves)
dht.on('peer', function (peer) {
  console.log(peer)
})
dht.findPeers(300)


// Send UDP packet to echo server
// var socket = require('./socket')

// var sock = new socket.UDPSocket('localhost', 54244)
// sock.connect(function (err) {
//   if (err) throw err

//   sock.write('hello')
// })

