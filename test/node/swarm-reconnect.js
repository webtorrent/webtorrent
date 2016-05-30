// var Buffer = require('safe-buffer').Buffer
// var hat = require('hat')
// var Swarm = require('../../lib/swarm')
// var test = require('tape')

// var infoHash = 'd2474e86c95b19b8bcfdb92bc12c9d44667cfa36'
// var peerId1 = Buffer.from('-WW0001-' + hat(48), 'utf8').toString('hex')
// var peerId2 = Buffer.from('-WW0001-' + hat(48), 'utf8').toString('hex')

// test('reconnect when peer disconnects', function (t) {
//   t.plan(10)

//   var swarm1 = new Swarm(infoHash, peerId1)
//   swarm1.listen(0, function () {
//     var swarm2 = new Swarm(infoHash, peerId2)

//     var time1 = 0
//     swarm1.on('wire', function (wire) {
//       if (time1 === 0) {
//         t.ok(wire, 'Peer joined via listening port')
//         t.equal(swarm1.wires.length, 1)

//         // at some point in future, end wire
//         setTimeout(function () {
//           wire.destroy()
//         }, 100)

//         // ...and prevent reconnect
//         swarm1._drain = function () {}
//       } else if (time1 === 1) {
//         t.ok(wire, 'Remote peer reconnected')
//         t.equal(swarm1.wires.length, 1)
//       } else {
//         throw new Error('too many wire events (1)')
//       }
//       time1 += 1
//     })

//     var time2 = 0
//     swarm2.on('wire', function (wire) {
//       if (time2 === 0) {
//         t.ok(wire, 'Joined swarm, got wire')
//         t.equal(swarm2.wires.length, 1)

//         wire.on('end', function () {
//           t.pass('Wire ended by remote peer')
//           t.equal(swarm1.wires.length, 0)
//         })
//       } else if (time2 === 1) {
//         t.ok(wire, 'Reconnected to remote peer')
//         t.equal(swarm2.wires.length, 1)

//         swarm1.destroy()
//         swarm2.destroy()
//       } else {
//         throw new Error('too many wire events (2)')
//       }
//       time2 += 1
//     })

//     swarm2.addPeer('127.0.0.1:' + swarm1.address().port)
//   })
// })
