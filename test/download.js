var auto = require('run-auto')
var BitTorrentClient = require('../')
var BlockStream = require('block-stream')
var DHT = require('bittorrent-dht/client')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var TrackerServer = require('bittorrent-tracker').Server

var leavesFile = __dirname + '/torrents/Leaves of Grass by Walt Whitman.epub'
var leavesTorrent = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesParsed = parseTorrent(leavesTorrent)

var BLOCK_LENGTH = 16 * 1024
function writeToStorage (storage, file, cb) {
  var pieceIndex = 0
  fs.createReadStream(file)
    .pipe(new BlockStream(leavesParsed.pieceLength, { nopad: true }))
    .on('data', function (piece) {
      var index = pieceIndex
      pieceIndex += 1

      var blockIndex = 0
      var s = new BlockStream(BLOCK_LENGTH, { nopad: true })
      s.on('data', function (block) {
        var offset = blockIndex * BLOCK_LENGTH
        blockIndex += 1

        storage.writeBlock(index, offset, block)
      })
      s.write(piece)
      s.end()
    })
    .on('end', function () {
      cb(null)
    })
    .on('error', function (err) {
      cb(err)
    })
}

function downloadTrackerTest (t, serverType) {
  t.plan(8)

  var trackerStartCount = 0

  auto({
    tracker: function (cb) {
      var tracker = new TrackerServer(
        serverType === 'udp' ? { http: false } : { udp: false }
      )

      tracker.on('error', function (err) {
        t.fail(err)
      })

      tracker.on('start', function () {
        trackerStartCount += 1
      })

      tracker.listen(function (port) {
        var announceUrl = serverType === 'http'
          ? 'http://127.0.0.1:' + port + '/announce'
          : 'udp://127.0.0.1:' + port

        // Overwrite announce with our local tracker
        leavesParsed.announce = [ announceUrl ]
        leavesParsed.announceList = [[ announceUrl ]]

        cb(null, tracker)
      })
    },

    client1: ['tracker', function (cb) {
      var client1 = new BitTorrentClient({ dht: false })
      client1.on('error', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)

        writeToStorage(torrent.storage, leavesFile, function (err) {
          cb(err, client1)
        })
      })
    }],

    client2: ['client1', function (cb) {
      var client2 = new BitTorrentClient({ dht: false })
      client2.on('error', function (err) { t.fail(err) })

      client2.add(leavesParsed)

      client2.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.createReadStream()
        })

        torrent.once('done', function () {
          t.pass('client2 downloaded torrent from client1')
          cb(null, client2)
        })
      })
    }]

  }, function (err, r) {
    t.error(err)
    t.equal(trackerStartCount, 2)

    r.tracker.close(function () {
      t.pass('tracker closed')
    })
    r.client1.destroy(function () {
      t.pass('client1 destroyed')
    })
    r.client2.destroy(function () {
      t.pass('client2 destroyed')
    })
  })
}

test('Simple download using UDP tracker', function (t) {
  downloadTrackerTest(t, 'udp')
})

test('Simple download using HTTP tracker', function (t) {
  downloadTrackerTest(t, 'http')
})

test('Simple download using a tracker (only) via a magnet uri', function (t) {
  t.plan(8)

  var trackerStartCount = 0

  var magnetUri
  auto({
    tracker: function (cb) {
      var tracker = new TrackerServer('udp')

      tracker.on('error', function (err) {
        t.fail(err)
      })

      tracker.on('start', function () {
        trackerStartCount += 1
      })

      tracker.listen(function (port) {
        var announceUrl = 'udp://127.0.0.1:' + port
        leavesParsed.announce = [ announceUrl ]
        leavesParsed.announceList = [[ announceUrl ]]
        magnetUri = 'magnet:?xt=urn:btih:' + leavesParsed.infoHash + '&tr=' + encodeURIComponent(announceUrl)
        cb(null, tracker)
      })
    },

    client1: ['tracker', function (cb) {
      var client1 = new BitTorrentClient({ dht: false })
      client1.on('error', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names)

        writeToStorage(torrent.storage, leavesFile, function (err) {
          cb(err, client1)
        })
      })
    }],

    client2: ['client1', function (cb) {
      var client2 = new BitTorrentClient({ dht: false })
      client2.on('error', function (err) { t.fail(err) })

      client2.add(magnetUri)

      client2.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.createReadStream()
        })

        torrent.once('done', function () {
          t.pass('client2 downloaded torrent from client1')
          cb(null, client2)
        })
      })
    }]

  }, function (err, r) {
    t.error(err)
    t.equal(trackerStartCount, 2)

    r.tracker.close(function () {
      t.pass('tracker closed')
    })
    r.client1.destroy(function () {
      t.pass('client1 destroyed')
    })
    r.client2.destroy(function () {
      t.pass('client2 destroyed')
    })
  })
})

test('Simple download using DHT', function (t) {
  t.plan(7)

  // no trackers
  leavesParsed.announce = []
  leavesParsed.announceList = []

  // TODO: use actual DHT server here, instead of client
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
      var client1 = new BitTorrentClient({
        trackers: false,
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

        writeToStorage(torrent.storage, leavesFile, function (err) {
          wroteStorage = true
          maybeDone(err)
        })
      })
    }],

    client2: ['client1', function (cb, r) {
      var client2 = new BitTorrentClient({
        trackers: false,
        dht: { bootstrap: '127.0.0.1:' + r.dhtPort }
      })
      client2.on('error', function (err) { t.fail(err) })

      client2.add(leavesParsed)

      client2.on('torrent', function (torrent) {
        torrent.files.forEach(function (file) {
          file.createReadStream()
        })

        torrent.once('done', function () {
          t.pass('client2 downloaded torrent from client1')
          cb(null, client2)
        })
      })
    }],

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
