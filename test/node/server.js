var fixtures = require('webtorrent-fixtures')
var fs = require('fs')
var get = require('simple-get')
var test = require('tape')
var WebTorrent = require('../../')

test('torrent.createServer: programmatic http server', function (t) {
  t.plan(9)

  var client = new WebTorrent({ tracker: false, dht: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.add(fixtures.leaves.torrent, function (torrent) {
    t.pass('got "torrent" event')
    var server = torrent.createServer()

    server.listen(0, function () {
      var port = server.address().port
      t.pass('server is listening on ' + port)

      // Seeding after server is created should work
      torrent.load(fs.createReadStream(fixtures.leaves.contentPath), function (err) {
        t.error(err, 'loaded seed content into torrent')
      })

      var host = 'http://localhost:' + port

      // Index page should list files in the torrent
      get.concat(host + '/', function (err, res, data) {
        t.error(err, 'got http response for /')
        data = data.toString()
        t.ok(data.indexOf('Leaves of Grass by Walt Whitman.epub') !== -1)

        // Verify file content for first (and only) file
        get.concat(host + '/0', function (err, res, data) {
          t.error(err, 'got http response for /0')
          t.deepEqual(data, fixtures.leaves.content)

          server.close(function () {
            t.pass('server closed')
          })
          client.destroy(function (err) {
            t.error(err, 'client destroyed')
          })
        })
      })
    })
  })
})
