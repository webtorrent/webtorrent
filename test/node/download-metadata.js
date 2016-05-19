var fixtures = require('webtorrent-fixtures')
var http = require('http')
var test = require('tape')
var WebTorrent = require('../../')

function createServer (data, cb) {
  var server = http.createServer(function (req, res) {
    res.end(data)
  }).listen(function () {
    var address = server.address()
    if (address.family === 'IPv6') {
      address.address = '[' + address.address + ']'
    }
    var url = 'http://' + address.address + ':' + address.port + '/'
    cb(url, next)
  })

  function next () {
    server.close()
  }
}

test('Download metadata for magnet URI with xs parameter', function (t) {
  t.plan(2)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  createServer(fixtures.leaves.torrent, function (url, next) {
    client.add(fixtures.leaves.magnetURI + '&xs=' + encodeURIComponent(url), function (torrent) {
      t.equal(torrent.files[0].name, 'Leaves of Grass by Walt Whitman.epub')

      client.destroy(function (err) { t.error(err, 'client destroyed') })
      next()
    })
  })
})

test('Download metadata for magnet URI with xs parameter', function (t) {
  t.plan(2)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  createServer(fixtures.leaves.torrent, function (url, next) {
    var encoded = encodeURIComponent(url)
    var uri = fixtures.leaves.magnetURI + '&xs=' + encoded + '&xs=' + encoded + '2'

    client.add(uri, function (torrent) {
      t.equal(torrent.files[0].name, 'Leaves of Grass by Walt Whitman.epub')

      client.destroy(function (err) { t.error(err, 'client destroyed') })
      next()
    })
  })
})

test('Download metadata magnet URI with unsupported protocol in xs parameter', function (t) {
  t.plan(1)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.add(fixtures.leaves.magnetURI + '&xs=' + encodeURIComponent('invalidurl:example'))

  setTimeout(function () {
    // no crash by now
    client.destroy(function (err) { t.error(err, 'client destroyed') })
  }, 100)
})
