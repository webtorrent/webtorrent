const fixtures = require('webtorrent-fixtures')
const test = require('tape')
const WebTorrent = require('../../')

test('extension support', function (t) {
  t.plan(6)
  let extendedHandshakes = 0

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
      client1.destroy(function (err) {
        t.error(err, 'client1 destroyed')
      })
      client2.destroy(function (err) {
        t.error(err, 'client2 destroyed')
      })
    }
  }

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client2.on('error', function (err) { t.fail(err) })
  client2.on('warning', function (err) { t.fail(err) })

  client1.add(fixtures.leaves.parsedTorrent, function (torrent1) {
    torrent1.on('wire', function (wire) {
      t.pass('client1 onWire')
      wire.use(Extension)
    })
    const torrent2 = client2.add(fixtures.leaves.parsedTorrent.infoHash)
    torrent2.on('wire', function (wire) {
      t.pass('client2 onWire')
      wire.use(Extension)
    })
    torrent2.on('infoHash', function () {
      torrent2.addPeer('127.0.0.1:' + client1.address().port)
    })
  })
})
