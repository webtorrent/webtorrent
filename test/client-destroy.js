import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../index.js'

test('after client.destroy(), throw on client.add() or client.seed()', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.destroy(err => { t.error(err, 'client destroyed') })

  t.throws(() => {
    client.add(`magnet:?xt=urn:btih:${fixtures.leaves.parsedTorrent.infoHash}`)
  })
  t.throws(() => {
    client.seed(Buffer.from('sup'))
  })
})

test('after client.destroy(), no "torrent" or "ready" events emitted', t => {
  t.plan(1)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.add(fixtures.leaves.torrent, { name: 'leaves' }, () => {
    t.fail('unexpected "torrent" event (from add)')
  })
  client.seed(fixtures.leaves.content, { name: 'leaves' }, () => {
    t.fail('unexpected "torrent" event (from seed)')
  })
  client.on('ready', () => {
    t.fail('unexpected "ready" event')
  })

  client.destroy(err => { t.error(err, 'client destroyed') })
})
