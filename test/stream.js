/* global Blob */

var test = require('tape')
var Readable = require('readable-stream').Readable
var WebTorrent = require('../')
var concat = require('concat-stream')
var Tracker = require('bittorrent-tracker/server')

test('client.seed: stream', function (t) {
  t.plan(4)

  var announce = []
  var tracker = new Tracker()
  var seeder, client
  tracker.listen(function () {
    announce.push('http://localhost:'+tracker.http.address().port)
    seeder = new WebTorrent({ dht: false })
    client = new WebTorrent({ dht: false })

    seeder.on('error', function (err) { t.fail(err) })
    seeder.on('warning', function (err) { t.fail(err) })
    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    seed()
  })
  tracker.on('start', function () {
    console.log('START', argument)
  })

  t.once('end', function () {
    seeder.destroy(function (err) { if (err) t.error(err, 'seeder destroyed') })
    client.destroy(function (err) { if (err) t.error(err, 'client destroyed') })
    tracker.close()
  })

  var stream = new Readable
  stream._read = function () {}
  stream.push('HELLO WORLD\n')
  stream.push(null)

  function seed () {
    var sopts = {
      name: 'hello.txt',
      pieceLength: 5,
      announce: announce
    }
    var copts = { announce: announce }
    seeder.seed([stream], sopts, function (torrent) {
      console.log(torrent.magnetURI)
      // this works: client.add(torrent, copts, function (dl) {
      client.add(torrent.magnetURI, copts, function (dl) {
        t.equal(dl.files.length, 1)
        t.equal(dl.files[0].name, 'hello.txt')
        t.equal(dl.files[0].length, 12)
        dl.files[0].createReadStream()
          .pipe(concat({ encoding: 'string' }, function (body) {
            t.equal(body, 'HELLO WORLD\n', 'content')
          }))
      })
    })
  }
})
