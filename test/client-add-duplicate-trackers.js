var common = require('./common')
var test = require('tape')
var WebTorrent = require('../')

test('client.add: magnet uri, utf-8 string', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  var torrent = client.add(common.leaves.torrent, {
    announce: [ 'wss://example.com', 'wss://example.com', 'wss://example.com' ]
  })

  torrent.on('ready', function () {
    t.equal(torrent.magnetURI, common.leaves.magnetURI + '&tr=' + encodeURIComponent('wss://example.com'))
    client.remove(common.leaves.magnetURI, function (err) { t.error(err, 'torrent destroyed') })
    client.destroy(function (err) { t.error(err, 'client destroyed') })
  })
})
