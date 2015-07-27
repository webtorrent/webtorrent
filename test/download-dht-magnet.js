var auto = require('run-auto')
var DHT = require('bittorrent-dht/server')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var WebTorrent = require('../')

var leavesPath = __dirname + '/content/Leaves of Grass by Walt Whitman.epub'
var leavesFile = fs.readFileSync(leavesPath)
var leavesTorrent = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesParsed = parseTorrent(leavesTorrent)

// remove trackers from .torrent file
leavesParsed.announce = []

test('Download using DHT (via magnet uri)', function (t) {
  t.plan(10)

  var dhtServer = new DHT({ bootstrap: false })
  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })

  var magnetUri = 'magnet:?xt=urn:btih:' + leavesParsed.infoHash

  auto({
    dhtPort: function (cb) {
      dhtServer.listen(function () {
        var port = dhtServer.address().port
        cb(null, port)
      })
    },
    client1: ['dhtPort', function (cb, r) {
      var client1 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort }
      })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      var announced = false
      var wroteStorage = false
      function maybeDone () {
        if (announced && wroteStorage) cb(null, client1)
      }

      client1.add(leavesParsed, function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [ 'Leaves of Grass by Walt Whitman.epub' ]
        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)

        torrent.on('dhtAnnounce', function () {
          announced = true
          maybeDone()
        })

        torrent.storage.load(fs.createReadStream(leavesPath), function (err) {
          t.error(err)
          wroteStorage = true
          maybeDone()
        })
      })
    }],

    client2: ['client1', function (cb, r) {
      var client2 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort }
      })
      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var gotBuffer = false
      var gotDone = false
      function maybeDone () {
        if (gotBuffer && gotDone) cb(null, client2)
      }

      client2.add(magnetUri, function (torrent) {
        torrent.files[0].getBuffer(function (err, buf) {
          t.error(err)
          t.deepEqual(buf, leavesFile, 'downloaded correct content')

          gotBuffer = true
          maybeDone()
        })

        torrent.once('done', function () {
          t.pass('client2 downloaded torrent from client1')

          gotDone = true
          maybeDone()
        })
      })
    }]
  }, function (err, r) {
    t.error(err)
    r.client1.destroy(function () {
      t.pass('client1 destroyed')
    })
    r.client2.destroy(function () {
      t.pass('client2 destroyed')
    })
    dhtServer.destroy(function () {
      t.pass('dht server destroyed')
    })
  })
})
