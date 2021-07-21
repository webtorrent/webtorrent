const fixtures = require('webtorrent-fixtures')
const test = require('tape')
const WebTorrent = require('../')

test('client.remove: remove by Torrent object', t => {
  t.plan(5)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)
  t.equal(client.torrents.length, 1)

  torrent.on('infoHash', () => {
    t.equal(torrent.infoHash, fixtures.leaves.parsedTorrent.infoHash)

    client.remove(torrent, err => { t.error(err, 'torrent destroyed') })
    t.equal(client.torrents.length, 0)

    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})
