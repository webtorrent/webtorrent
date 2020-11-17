const fixtures = require('webtorrent-fixtures')
const test = require('tape')
const WebTorrent = require('../')

test('after client.destroy(), throw on client.add() or client.seed()', function (t) {
  t.plan(3)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.destroy(function (err) { t.error(err, 'client destroyed') })

  t.throws(function () {
    client.add('magnet:?xt=urn:btih:' + fixtures.leaves.parsedTorrent.infoHash)
  })
  t.throws(function () {
    client.seed(Buffer.from('sup'))
  })
})

test('after client.destroy(), no "torrent" or "ready" events emitted', function (t) {
  t.plan(1)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.add(fixtures.leaves.torrent, { name: 'leaves' }, function () {
    t.fail('unexpected "torrent" event (from add)')
  })
  client.seed(fixtures.leaves.content, { name: 'leaves' }, function () {
    t.fail('unexpected "torrent" event (from seed)')
  })
  client.on('ready', function () {
    t.fail('unexpected "ready" event')
  })

  client.destroy(function (err) { t.error(err, 'client destroyed') })
})
