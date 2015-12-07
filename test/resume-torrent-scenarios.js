var auto = require('run-auto')
var path = require('path')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var TrackerServer = require('bittorrent-tracker/server')
var WebTorrent = require('../')

var leavesPath = path.resolve(__dirname, 'content', 'Leaves of Grass by Walt Whitman.epub')
var leavesTorrent = fs.readFileSync(path.resolve(__dirname, 'torrents', 'leaves.torrent'))
var leavesParsed = parseTorrent(leavesTorrent)

var bunnyTorrent = fs.readFileSync(path.resolve(__dirname, 'torrents', 'sintel-5gb.torrent'))
var bunnyParsed = parseTorrent(bunnyTorrent)

test('Pause, Resume and Download using a REMOTE HTTP tracker (via .torrent file)', function (t) {
  remoteResumeTest(t)
})

test('S1.1 Torrent should pause when pause() is called', function (t) {
  scenario1_1Test(t, 'http')
})

test('S1.2 Paused torrent should resume when resume() is called', function (t) {
  scenario1_2Test(t, 'http')
})

test('S1.3 Un-Paused torrent should not do anything when resume() is called', function (t) {
  scenario1_3Test(t, 'http')
})

test('S1.4 Paused torrent should resume when resume() is called', function (t) {
  scenario1_4Test(t, 'http')
})

test('S1.5 Finished torrent should not do anything when pause() is called', function (t) {
  scenario1_5Test(t, 'http')
})

function remoteResumeTest (t) {
  t.plan(6)

  auto({

    client1: [ function (cb) {
      var client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      var count = 0
      var amountDownloadAtPause
      var isResumed = false

      client1.add(bunnyParsed)

      client1.on('resume', function () {
        isResumed = true
      })

      client1.once('torrent', function (torrent) {
        t.pass('torrent correctly initialized')
        client1.on('download', function (downloaded) {
          if (!isResumed) {
            if (count === 2) {
              torrent.pause(function () {
                t.ok(torrent.paused, 'Torrent is paused')
                amountDownloadAtPause = torrent.downloaded
                torrent.resume()
                t.ok(torrent.resumed, 'Torrent is resumed')
              })
            } else {
              count++
            }
          } else {
            t.equal(amountDownloadAtPause, torrent.downloaded - downloaded, 'resume() saved previously downloaded data')
            cb(null, client1)
          }
        })
      })
    }]
  }, function (err, r) {
    t.error(err)
    r.client1.destroy(function () {
      t.pass('client1 destroyed')
    })
  })
}

function scenario1_1Test (t, serverType) {
  t.plan(7)
  var trackerStartCount = 0

  auto({
    tracker: function (cb) {
      var tracker = new TrackerServer(
        serverType === 'udp' ? { http: false, ws: false } : { udp: false, ws: false }
      )

      tracker.on('error', function (err) { t.fail(err) })
      tracker.on('warning', function (err) { t.fail(err) })

      tracker.on('start', function () {
        trackerStartCount += 1
      })

      tracker.listen(function () {
        var port = tracker[serverType].address().port
        var announceUrl = serverType === 'http'
          ? 'http://127.0.0.1:' + port + '/announce'
          : 'udp://127.0.0.1:' + port
        console.log('server listening on ' + announceUrl)

        // Overwrite announce with our local tracker
        leavesParsed.announce = [ announceUrl ]

        cb(null, tracker)
      })
    },

    client1: ['tracker', function (cb) {
      var client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names, 'torrent file names should be equal')

        torrent.load(fs.createReadStream(leavesPath), function (err) {
          cb(err, client1)
        })
      })
    }],

    client2: ['client1', function (cb) {
      var client2 = new WebTorrent({ dht: false })
      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var currentTorrent = client2.add(leavesParsed)

      client2.once('infoHash', function () {
        // Pause the torrent
        client2.pause(currentTorrent)
        t.ok(currentTorrent.paused, 'Torrent should be paused')

        currentTorrent.once('done', function () {
          t.fail('Torrent should not be finished')
        })

        cb(null, client2)
      })
    }]
  }, function (err, r) {
    t.error(err)
    t.equal(trackerStartCount, 1, 'trackerStartCount should be 1')

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

function scenario1_2Test (t, serverType) {
  t.plan(11)
  var trackerStartCount = 0

  auto({
    tracker: function (cb) {
      var tracker = new TrackerServer(
        serverType === 'udp' ? { http: false, ws: false } : { udp: false, ws: false }
      )

      tracker.on('error', function (err) { t.fail(err) })
      tracker.on('warning', function (err) { t.fail(err) })

      tracker.on('start', function () {
        trackerStartCount += 1
      })

      tracker.listen(function () {
        var port = tracker[serverType].address().port
        var announceUrl = serverType === 'http'
          ? 'http://127.0.0.1:' + port + '/announce'
          : 'udp://127.0.0.1:' + port
        console.log('server listening on ' + announceUrl)

        // Overwrite announce with our local tracker
        leavesParsed.announce = [ announceUrl ]

        cb(null, tracker)
      })
    },

    client1: ['tracker', function (cb) {
      var client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names, 'torrent file names should be equal')

        torrent.load(fs.createReadStream(leavesPath), function (err) {
          cb(err, client1)
        })
      })
    }],

    client2: ['client1', function (cb) {
      var client2 = new WebTorrent({ dht: false })
      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var currentTorrent = client2.add(leavesParsed)

      client2.once('torrent', function (torrent) {
        // Pause the torrent
        client2.pause(currentTorrent)
        t.ok(currentTorrent.paused, 'Torrent should be paused')

        // Check that we can resume
        torrent.resume(currentTorrent)
        t.ok(currentTorrent.resumed, 'Torrent should be resumed')
        t.notOk(currentTorrent.paused, 'Torrent should be not be paused')

        currentTorrent.once('done', function () {
          t.pass('Torrent should be finished')
          cb(null, client2)
        })
      })
    }]
  }, function (err, r) {
    t.error(err)
    t.equal(trackerStartCount, 2, 'trackerStartCount should be 2')

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

function scenario1_3Test (t, serverType) {
  t.plan(9)
  var trackerStartCount = 0

  auto({
    tracker: function (cb) {
      var tracker = new TrackerServer(
        serverType === 'udp' ? { http: false, ws: false } : { udp: false, ws: false }
      )

      tracker.on('error', function (err) { t.fail(err) })
      tracker.on('warning', function (err) { t.fail(err) })

      tracker.on('start', function () {
        trackerStartCount += 1
      })

      tracker.listen(function () {
        var port = tracker[serverType].address().port
        var announceUrl = serverType === 'http'
          ? 'http://127.0.0.1:' + port + '/announce'
          : 'udp://127.0.0.1:' + port
        console.log('server listening on ' + announceUrl)

        // Overwrite announce with our local tracker
        leavesParsed.announce = [ announceUrl ]

        cb(null, tracker)
      })
    },

    client1: ['tracker', function (cb) {
      var client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names, 'torrent file names should be equal')

        torrent.load(fs.createReadStream(leavesPath), function (err) {
          cb(err, client1)
        })
      })
    }],

    client2: ['client1', function (cb) {
      var client2 = new WebTorrent({ dht: false })
      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var currentTorrent = client2.add(leavesParsed)

      client2.once('torrent', function (torrent) {
        torrent.resume(currentTorrent)
        t.notOk(currentTorrent.resumed, 'Torrent should not be resumed')

        currentTorrent.once('done', function () {
          t.pass('Torrent should be finished')
          cb(null, client2)
        })
      })
    }]
  }, function (err, r) {
    t.error(err)
    t.equal(trackerStartCount, 2, 'trackerStartCount should be 2')

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

function scenario1_4Test (t, serverType) {
  t.plan(8)
  var trackerStartCount = 0

  auto({
    tracker: function (cb) {
      var tracker = new TrackerServer(
        serverType === 'udp' ? { http: false, ws: false } : { udp: false, ws: false }
      )

      tracker.on('error', function (err) { t.fail(err) })
      tracker.on('warning', function (err) { t.fail(err) })

      tracker.on('start', function () {
        trackerStartCount += 1
      })

      tracker.listen(function () {
        var port = tracker[serverType].address().port
        var announceUrl = serverType === 'http'
          ? 'http://127.0.0.1:' + port + '/announce'
          : 'udp://127.0.0.1:' + port
        console.log('server listening on ' + announceUrl)

        // Overwrite announce with our local tracker
        leavesParsed.announce = [ announceUrl ]

        cb(null, tracker)
      })
    },

    client1: ['tracker', function (cb) {
      var client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names, 'torrent file names should be equal')

        torrent.load(fs.createReadStream(leavesPath), function (err) {
          cb(err, client1)
        })
      })
    }],

    client2: ['client1', function (cb) {
      var client2 = new WebTorrent({ dht: false })
      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var currentTorrent = client2.add(leavesParsed)

      client2.once('infoHash', function () {
        client2.pause(currentTorrent)
        t.ok(currentTorrent.paused, 'Torrent should be paused')

        client2.pause(currentTorrent)
        t.ok(currentTorrent.paused, 'Torrent should still be paused')

        currentTorrent.once('paused', function () {
          t.fail('Torrent should not be paused')
        })
        currentTorrent.once('done', function () {
          t.fail('Torrent should not be able to finish')
        })
        cb(null, client2)
      })
    }]
  }, function (err, r) {
    t.error(err)
    t.equal(trackerStartCount, 1, 'trackerStartCount should be 1')

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

function scenario1_5Test (t, serverType) {
  t.plan(9)
  var trackerStartCount = 0

  auto({
    tracker: function (cb) {
      var tracker = new TrackerServer(
        serverType === 'udp' ? { http: false, ws: false } : { udp: false, ws: false }
      )

      tracker.on('error', function (err) { t.fail(err) })
      tracker.on('warning', function (err) { t.fail(err) })

      tracker.on('start', function () {
        trackerStartCount += 1
      })

      tracker.listen(function () {
        var port = tracker[serverType].address().port
        var announceUrl = serverType === 'http'
          ? 'http://127.0.0.1:' + port + '/announce'
          : 'udp://127.0.0.1:' + port
        console.log('server listening on ' + announceUrl)

        // Overwrite announce with our local tracker
        leavesParsed.announce = [ announceUrl ]

        cb(null, tracker)
      })
    },

    client1: ['tracker', function (cb) {
      var client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names, 'torrent file names should be equal')

        torrent.load(fs.createReadStream(leavesPath), function (err) {
          cb(err, client1)
        })
      })
    }],

    client2: ['client1', function (cb) {
      var client2 = new WebTorrent({ dht: false })
      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var currentTorrent = client2.add(leavesParsed)

      client2.once('torrent', function (torrent) {
        currentTorrent.once('done', function () {
          t.pass('Torrent should be finished')

          currentTorrent.once('paused', function () {
            t.fail('Torrent should not be paused')
          })

          client2.pause(currentTorrent)
          t.notOk(currentTorrent.paused, 'Torrent should not be paused')
          cb(null, client2)
        })
      })
    }]
  }, function (err, r) {
    t.error(err)
    t.equal(trackerStartCount, 2, 'trackerStartCount should be 2')

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
