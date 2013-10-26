var isChromeApp = !!(window.chrome && chrome.app && chrome.app.runtime)

// var socket = require('./socket')

// var sock = new socket.UDPSocket('localhost', 54244)
// sock.connect(function (err) {
//   if (err) throw err

//   sock.write('hello')
// })




// require the core node events module
var EventEmitter = require('events').EventEmitter

//create a new event emitter
var emitter = new EventEmitter()

// set up a listener for the event
emitter.on('pizza', function(message){
  console.log(message);
});

// emit an event
emitter.emit('pizza', 'pizza is extremely yummy');