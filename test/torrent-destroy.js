import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import Wire from 'bittorrent-protocol'
import WebTorrent from '../index.js'

test('torrent.destroy: destroy and remove torrent', t => {
  t.plan(5)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', () => {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)

    torrent.destroy(err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})

test('torrent.destroy: wire timeout after destruction does not throw or destroy wire', t => {
  t.plan(7)
  t.timeoutAfter(5000)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  let wire
  t.teardown(() => {
    if (wire && !wire.destroyed) wire.destroy()
    if (!client.destroyed) client.destroy()
  })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)
  torrent.on('error', err => { t.fail(err) })

  torrent.on('infoHash', () => {
    wire = new Wire()
    let wireDestroyed = false
    const origDestroy = wire.destroy.bind(wire)
    wire.destroy = function (...args) {
      wireDestroyed = true
      return origDestroy(...args)
    }

    torrent._onWire(wire, '127.0.0.1:5000')
    t.equal(torrent.wires.length, 1, 'wire added to torrent')

    torrent.destroy(err => {
      t.error(err, 'torrent destroyed')
      t.equal(torrent.destroyed, true, 'torrent is destroyed')
      t.equal(torrent.client, null, 'torrent client is null')

      t.doesNotThrow(() => {
        wire.emit('timeout')
      }, 'delayed wire timeout does not throw after torrent destruction')

      t.equal(wireDestroyed, false, 'wire was not destroyed after torrent destruction')

      t.doesNotThrow(() => {
        torrent._debug('test message after destroy')
      }, 'torrent._debug is null-safe when client is null')
    })
  })
})
