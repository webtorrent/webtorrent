// var Buffer = require('safe-buffer').Buffer
// var hat = require('hat')
// var Swarm = require('../../lib/swarm')
// var test = require('tape')

// var infoHash = 'd2474e86c95b19b8bcfdb92bc12c9d44667cfa36'
// var infoHash2 = 'd2474e86c95b19b8bcfdb92bc12c9d44667cfa37'
// var peerId = Buffer.from('-WW0001-' + hat(48), 'utf8').toString('hex')
// var peerId2 = Buffer.from('-WW0001-' + hat(48), 'utf8').toString('hex')

// test('two swarms listen on same port', function (t) {
//   t.plan(2)

//   var swarm1 = new Swarm(infoHash, peerId)
//   swarm1.listen(0, function () {
//     var port = swarm1.address().port
//     t.ok(typeof port === 'number' && port !== 0)

//     var swarm2 = new Swarm(infoHash2, peerId)
//     swarm2.listen(port, function () {
//       t.equal(swarm2.address().port, port, 'listened on requested port')
//       swarm1.destroy()
//       swarm2.destroy()
//     })
//   })
// })

// test('swarm join', function (t) {
//   t.plan(10)

//   var swarm1 = new Swarm(infoHash, peerId)
//   swarm1.listen(0, function () {
//     var swarm2 = new Swarm(infoHash, peerId2)

//     t.equal(swarm1.wires.length, 0)
//     t.equal(swarm2.wires.length, 0)

//     swarm2.addPeer('127.0.0.1:' + swarm1.address().port)

//     swarm1.on('wire', function (wire, addr) {
//       t.ok(wire, 'Peer join our swarm via listening port')

//       t.equal(swarm1.wires.length, 1)
//       t.ok(/127\.0\.0\.1:\d{1,5}/.test(addr))
//       t.equal(wire.peerId.toString('hex'), peerId2)
//     })

//     swarm2.on('wire', function (wire, addr) {
//       t.ok(wire, 'Joined swarm, got wire')

//       t.equal(swarm2.wires.length, 1)
//       t.ok(/127\.0\.0\.1:\d{1,5}/.test(addr))
//       t.equal(wire.peerId.toString('hex'), peerId)
//     })

//     t.on('end', function () {
//       swarm1.destroy()
//       swarm2.destroy()
//     })
//   })
// })
