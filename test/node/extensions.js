import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../../index.js'

test('extension support', t => {
  t.plan(6)
  let extendedHandshakes = 0

  class Extension {
    constructor (wire) {
      wire.extendedHandshake.test = 'Hello, World!'
    }

    onExtendedHandshake (extendedHandshake) {
      extendedHandshakes += 1

      t.equal(
        Buffer.from(extendedHandshake.test).toString(), 'Hello, World!',
        'handshake.test === Hello, World!'
      )

      if (extendedHandshakes === 2) {
        client1.destroy(err => {
          t.error(err, 'client1 destroyed')
        })
        client2.destroy(err => {
          t.error(err, 'client2 destroyed')
        })
      }
    }
  }

  Extension.prototype.name = 'wt_test'

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })

  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  client1.add(fixtures.leaves.parsedTorrent, torrent1 => {
    torrent1.on('wire', wire => {
      t.pass('client1 onWire')
      wire.use(Extension)
    })
    const torrent2 = client2.add(fixtures.leaves.parsedTorrent.infoHash)
    torrent2.on('wire', wire => {
      t.pass('client2 onWire')
      wire.use(Extension)
    })
    torrent2.on('infoHash', () => {
      torrent2.addPeer(`127.0.0.1:${client1.address().port}`)
    })
  })
})
