// var Buffer = require('safe-buffer').Buffer
// var hat = require('hat')
// var Swarm = require('../../lib/swarm')
// var test = require('tape')

// var infoHash = 'd2474e86c95b19b8bcfdb92bc12c9d44667cfa36'
// var peerId1 = Buffer.from('-WW0001-' + hat(48), 'utf8').toString('hex')
// var peerId2 = Buffer.from('-WW0001-' + hat(48), 'utf8').toString('hex')

// test('timeout if no handshake in 25 seconds', function (t) {
//   t.plan(4)

//   var swarm1 = new Swarm(infoHash, peerId1)

//   var _addIncomingPeer = swarm1._addIncomingPeer
//   swarm1._addIncomingPeer = function (peer) {
//     // Nuke the handshake function on swarm1's peer to test swarm2's
//     // handshake timeout code
//     peer.wire.handshake = function () {}
//     _addIncomingPeer.call(swarm1, peer)
//   }

//   swarm1.listen(0, function () {
//     var swarm2 = new Swarm(infoHash, peerId2)

//     var numWires = 0
//     swarm1.on('wire', function (wire) {
//       numWires += 1
//       if (numWires === 1) {
//         t.ok(wire, 'Got wire via listening port')
//         t.equal(swarm1.wires.length, 1)

//         // swarm2 should never get a wire since swarm1 refuses to send it a
//         // handshake
//         t.equal(swarm2.wires.length, 0)
//       } else if (numWires === 2) {
//         t.pass('swarm2 reconnected after timeout')
//         swarm1.destroy()
//         swarm2.destroy()
//       } else {
//         t.fail('got wire after destroy')
//       }
//     })

//     swarm2.on('wire', function (wire) {
//       t.fail('Should not get a wire because peer did not handshake')
//     })

//     swarm2.addPeer('127.0.0.1:' + swarm1.address().port)
//   })
// })
