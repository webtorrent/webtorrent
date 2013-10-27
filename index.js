// var isChromeApp = !!(window.chrome && chrome.app && chrome.app.runtime)

// if (isChromeApp) {
//   console.log('This is a Chrome App')
// }

window.log = function (data) {
  document.getElementById('console').innerHTML += data + '<br>'
}

var DHT = require('./lib/bittorrent-dht')
var leaves = 'D2474E86C95B19B8BCFDB92BC12C9D44667CFA36'

var dht = new DHT(leaves)
dht.on('peer', function (peer) {
  console.log(peer)
})
dht.findPeers(300)



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
