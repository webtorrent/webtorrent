var fixtures = require('webtorrent-fixtures')
var http = require('http')
var test = require('tape')
var WebTorrent = require('../../')

function createServer (data, cb) {
  var server = http.createServer(function (req, res) {
    if (req.url !== '/') {
      res.statusCode = 404
      res.end()
    } else {
      res.end(data)
    }
  })

  server.on('listening', function () {
    var address = server.address()
    var url = 'http://127.0.0.1:' + address.port + '/'
    cb(url, server)
  })

  server.listen()
}

test('Download metadata for magnet URI with xs parameter', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  createServer(fixtures.leaves.torrent, function (url, server) {
    var encodedUrl = encodeURIComponent(url)
    client.add(fixtures.leaves.magnetURI + '&xs=' + encodedUrl, function (torrent) {
      t.equal(torrent.files[0].name, 'Leaves of Grass by Walt Whitman.epub')
      client.destroy(function (err) { t.error(err, 'client destroyed') })
      server.close(function () { t.pass('server closed') })
    })
  })
})

test('Download metadata for magnet URI with 2 xs parameters', function (t) {
  t.plan(4)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  createServer(fixtures.leaves.torrent, function (url1, server1) {
    var encodedUrl1 = encodeURIComponent(url1)

    createServer(fixtures.leaves.torrent, function (url2, server2) {
      var encodedUrl2 = encodeURIComponent(url2)

      var uri = fixtures.leaves.magnetURI + '&xs=' + encodedUrl1 + '&xs=' + encodedUrl2

      client.add(uri, function (torrent) {
        t.equal(torrent.files[0].name, 'Leaves of Grass by Walt Whitman.epub')
        client.destroy(function (err) { t.error(err, 'client destroyed') })
        server1.close(function () { t.pass('server closed') })
        server2.close(function () { t.pass('server closed') })
      })
    })
  })
})

test('Download metadata for magnet URI with 2 xs parameters, with 1 invalid protocol', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  createServer(fixtures.leaves.torrent, function (url, server) {
    var encodedUrl1 = encodeURIComponent('invalidurl:example')
    var encodedUrl2 = encodeURIComponent(url)
    var uri = fixtures.leaves.magnetURI + '&xs=' + encodedUrl1 + '&xs=' + encodedUrl2

    client.add(uri, function (torrent) {
      t.equal(torrent.files[0].name, 'Leaves of Grass by Walt Whitman.epub')
      client.destroy(function (err) { t.error(err, 'client destroyed') })
      server.close(function () { t.pass('server closed') })
    })
  })
})

test('Download metadata for magnet URI with 2 xs parameters, with 1 404 URL', function (t) {
  t.plan(3)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  createServer(fixtures.leaves.torrent, function (url, server) {
    var encodedUrl1 = encodeURIComponent(url + 'blah_404')
    var encodedUrl2 = encodeURIComponent(url)
    var uri = fixtures.leaves.magnetURI + '&xs=' + encodedUrl1 + '&xs=' + encodedUrl2

    client.add(uri, function (torrent) {
      t.equal(torrent.files[0].name, 'Leaves of Grass by Walt Whitman.epub')
      client.destroy(function (err) { t.error(err, 'client destroyed') })
      server.close(function () { t.pass('server closed') })
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
