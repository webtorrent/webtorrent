var Readable = require('readable-stream').Readable
var series = require('run-series')
var test = require('tape')
var Tracker = require('bittorrent-tracker/server')
var WebTorrent = require('../../')

test('client.seed: stream', function (t) {
  t.plan(9)

  var tracker = new Tracker({ udp: false, ws: false })

  tracker.on('error', function (err) { t.fail(err) })
  tracker.on('warning', function (err) { t.fail(err) })

  var seeder, client, announceUrl, magnetURI

  series([
    function (cb) {
      tracker.listen(cb)
    },

    function (cb) {
      var port = tracker.http.address().port
      announceUrl = 'http://localhost:' + port + '/announce'

      seeder = new WebTorrent({ dht: false })

      seeder.on('error', function (err) { t.fail(err) })
      seeder.on('warning', function (err) { t.fail(err) })

      var stream = new Readable()
      stream._read = function () {}
      stream.push('HELLO WORLD\n')
      stream.push(null)

      var seederOpts = {
        name: 'hello.txt',
        pieceLength: 5,
        announce: [ announceUrl ]
      }
      seeder.seed([stream], seederOpts, function (torrent) {
        magnetURI = torrent.magnetURI
        cb(null)
      })
    },

    function (cb) {
      client = new WebTorrent({ dht: false })

      client.on('error', function (err) { t.fail(err) })
      client.on('warning', function (err) { t.fail(err) })

      client.add(magnetURI, function (dl) {
        t.equal(dl.files.length, 1)
        t.equal(dl.files[0].name, 'hello.txt')
        t.equal(dl.files[0].length, 12)
        dl.files[0].getBuffer(function (err, buf) {
          t.error(err)
          t.equal(buf.toString('utf8'), 'HELLO WORLD\n', 'content')

          cb(null)
        })
      })
    }
  ], function (err) {
    t.error(err)
    seeder.destroy(function (err) { t.error(err, 'seeder destroyed') })
    client.destroy(function (err) { t.error(err, 'client destroyed') })
    tracker.close(function () { t.pass('tracker closed') })
  })
})
