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
leavesParsed.announceList = []

test('Download using DHT (via .torrent file)', function (t) {
  t.plan(8)

  var dhtServer = new DHT({ bootstrap: false })

  dhtServer.on('error', function (err) {
    t.fail(err)
  })

  auto({
    dhtPort: function (cb) {
      dhtServer.listen(function (port) {
        cb(null, port)
      })
    },
    client1: ['dhtPort', function (cb, r) {
      var client1 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort }
      })
      client1.on('error', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      var announced, wroteStorage
      function maybeDone (err) {
        if ((announced && wroteStorage) || err) cb(err, client1)
      }

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [ 'Leaves of Grass by Walt Whitman.epub' ]
        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)

        torrent.on('dhtAnnounce', function () {
          announced = true
          maybeDone(null)
        })

        torrent.storage.load(fs.createReadStream(leavesPath), function (err) {
          wroteStorage = true
          maybeDone(err)
        })
      })
    }],

    client2: ['client1', function (cb, r) {
      var client2 = new WebTorrent({
        tracker: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort }
      })
      client2.on('error', function (err) { t.fail(err) })

      client2.add(leavesParsed)

      client2.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.getBuffer(function (err, buf) {
            if (err) throw err
            t.deepEqual(buf, leavesFile, 'downloaded correct content')
          })
        })

        torrent.once('done', function () {
          t.pass('client2 downloaded torrent from client1')
          cb(null, client2)
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
