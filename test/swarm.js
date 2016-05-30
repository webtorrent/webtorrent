// var Buffer = require('safe-buffer').Buffer
// var hat = require('hat')
// var Swarm = require('../lib/swarm')
// var test = require('tape')

// var infoHash = 'd2474e86c95b19b8bcfdb92bc12c9d44667cfa36'
// var infoHash2 = 'd2474e86c95b19b8bcfdb92bc12c9d44667cfa37'
// var peerId = Buffer.from('-WW0001-' + hat(48), 'utf8').toString('hex')
// var peerId2 = Buffer.from('-WW0001-' + hat(48), 'utf8').toString('hex')

// test('create swarm, check invariants', function (t) {
//   var swarm = new Swarm(infoHash, peerId)

//   t.equal(swarm.infoHash.toString('hex'), infoHash)
//   t.equal(swarm.peerId.toString('hex'), peerId)
//   t.equal(swarm.downloaded, 0)
//   t.equal(swarm.uploaded, 0)
//   t.ok(Array.isArray(swarm.wires))
//   t.equal(swarm.wires.length, 0)
//   t.end()
// })

// test('swarm listen(0) selects free port', function (t) {
//   t.plan(2)

//   var swarm = new Swarm(infoHash, peerId)
//   swarm.listen(0)
//   swarm.on('listening', function () {
//     var port = swarm.address().port
//     t.equal(typeof port, 'number', 'port is a number')
//     if (process.browser) {
//       t.equal(port, 0, 'port number is 0')
//     } else {
//       t.ok(port > 0 && port < 65535, 'valid port number')
//     }
//     swarm.destroy()
//   })
// })

// test('two swarms listen on same port (implicit)', function (t) {
//   t.plan(5)

//   // When no port is specified and listen is called twice, they should get assigned the same port.

//   var swarm1 = new Swarm(infoHash, peerId)
//   var swarm2 = new Swarm(infoHash2, peerId2)

//   var swarm1Port
//   var swarm2Port

//   function maybeDone () {
//     if (swarm1.listening && swarm2.listening) {
//       t.equal(swarm1Port, swarm2Port, 'swarms were given same port')

//       t.equal(typeof swarm1Port, 'number', 'port is a number')
//       if (process.browser) {
//         t.equal(swarm1Port, 0, 'port number is 0')
//       } else {
//         t.ok(swarm1Port > 0 && swarm1Port < 65535, 'valid port number')
//       }

//       t.equal(typeof swarm2Port, 'number', 'port is a number')
//       if (process.browser) {
//         t.equal(swarm2Port, 0, 'port number is 0')
//       } else {
//         t.ok(swarm2Port > 0 && swarm2Port < 65535, 'valid port number')
//       }

//       swarm1.destroy()
//       swarm2.destroy()
//     }
//   }

//   swarm1.listen(0, function () {
//     swarm1Port = swarm1.address().port
//     maybeDone()
//   })

//   swarm2.listen(0, function (port2) {
//     swarm2Port = swarm2.address().port
//     maybeDone()
//   })
// })
