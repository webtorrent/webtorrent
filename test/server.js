var fs = require('fs')
var get = require('simple-get')
var path = require('path')
var test = require('tape')
var WebTorrent = require('../')

var leavesPath = path.resolve(__dirname, 'content', 'Leaves of Grass by Walt Whitman.epub')
var leavesTorrent = fs.readFileSync(path.resolve(__dirname, 'torrents', 'leaves.torrent'))

test('torrent.createServer(): programmatic http server', function (t) {
  t.plan(9)

  var client = new WebTorrent({ tracker: false, dht: false })
  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.add(leavesTorrent, function (torrent) {
    t.pass('got "torrent" event')
    var server = torrent.createServer()

    server.listen(0, function () {
      var port = server.address().port
      t.pass('server is listening on ' + port)

      // Seeding after server is created should work
      torrent.load(fs.createReadStream(leavesPath), function (err) {
        t.error(err, 'loaded seed content into torrent')
      })

      var host = 'http://localhost:' + port

      // Index page should list files in the torrent
      get.concat(host + '/', function (err, data) {
        t.error(err)
        data = data.toString()
        t.ok(data.indexOf('Leaves of Grass by Walt Whitman.epub') !== -1)

        // Verify file content for first (and only) file
        get.concat(host + '/0', function (err, data) {
          t.error(err)
          t.deepEqual(data, fs.readFileSync(leavesPath))

          server.close(function () { t.pass('server closed') })
          client.destroy(function () { t.pass('client destroyed') })
        })
      })
    })
  })
})
