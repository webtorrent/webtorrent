var common = require('./common')
var test = require('tape')
var WebTorrent = require('../')

test('after client.destroy(), throw on client.add() or client.seed()', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.destroy(function (err) { t.error(err, 'client destroyed') })

  t.throws(function () {
    client.add('magnet:?xt=urn:btih:' + common.leaves.parsedTorrent.infoHash)
  })
  t.throws(function () {
    client.seed(new Buffer('sup'))
  })
})

test('after client.destroy(), no "torrent" or "ready" events emitted', function (t) {
  t.plan(1)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.add(common.leaves.torrent, { name: 'leaves' }, function () {
    t.fail('unexpected "torrent" event (from add)')
  })
  client.seed(common.leaves.content, { name: 'leaves' }, function () {
    t.fail('unexpected "torrent" event (from seed)')
  })
  client.on('ready', function () {
    t.fail('unexpected "ready" event')
  })

  client.destroy(function (err) { t.error(err, 'client destroyed') })
})
