const fixtures = require('webtorrent-fixtures')
const test = require('tape')
const WebTorrent = require('../')

test('client.seed: torrent file (Buffer)', function (t) {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, function (torrent) {
    client.remove(torrent, function (err) { t.error(err, 'torrent removed') })
    t.equal(client.torrents.length, 0)

    // client.add()

    // client.deselect()

    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})
