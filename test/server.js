var fs = require('fs')
var get = require('simple-get')
var portfinder = require('portfinder')
var test = require('tape')
var WebTorrent = require('../')

var leavesPath = __dirname + '/content/Leaves of Grass by Walt Whitman.epub'
var leavesTorrent = fs.readFileSync(__dirname + '/torrents/leaves.torrent')

test('start http server programmatically', function (t) {
  var client = new WebTorrent()
  var torrent = client.add(leavesTorrent, { dht: false, tracker: false }, function (torrent) {
    portfinder.getPort(function (err, port) {
      if (err) throw err

      // create HTTP server for this torrent
      var server = torrent.createServer()
      server.listen(port)

      get.concat('http://localhost:' + port + '/0', function (err, data) {
        if (err) throw err
        // Verify data for first (and only file)
        t.deepEqual(data, fs.readFileSync(leavesPath))

        server.close()
        client.destroy()
        t.end()
      })
    })
  })
  torrent.on('ready', function () {
    torrent.storage.load(fs.createReadStream(leavesPath))
  })
})
