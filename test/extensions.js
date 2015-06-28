var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var WebTorrent = require('../')

var leaves = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesTorrent = parseTorrent(leaves)

test('extension support', function (t) {
  t.plan(6)
  var extendedHandshakes = 0

  function Extension (wire) {
    wire.extendedHandshake.test = 'Hello, World!'
  }

  Extension.prototype.name = 'wt_test'
  Extension.prototype.onExtendedHandshake = function (extendedHandshake) {
    extendedHandshakes += 1

    t.equal(
      extendedHandshake.test.toString(), 'Hello, World!',
      'handshake.test === Hello, World!'
    )

    if (extendedHandshakes === 2) {
      client1.destroy(function () {
        t.pass('client1 destroyed')
      })
      client2.destroy(function () {
        t.pass('client2 destroyed')
      })
    }
  }

  var client1 = new WebTorrent({ dht: false, tracker: false })
  var client2 = new WebTorrent({ dht: false, tracker: false })

  client1.add(leavesTorrent, function (torrent1) {
    torrent1.on('wire', function (wire) {
      t.pass('client1 onWire')
      wire.use(Extension)
    })
    var torrent2 = client2.add(leavesTorrent.infoHash)
    torrent2.on('wire', function (wire) {
      t.pass('client2 onWire')
      wire.use(Extension)
    })
    client2.on('listening', function () {
      torrent2.addPeer('127.0.0.1:' + client1.torrentPort)
    })
  })
})
