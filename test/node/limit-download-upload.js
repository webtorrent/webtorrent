const fixtures = require('webtorrent-fixtures')
const speedometer = require('speedometer')
const series = require('run-series')
const test = require('tape')
const devnull = require('dev-null')
const WebTorrent = require('../../')

const DOWNLOAD_SPEED_LIMIT = 3750000
const UPLOAD_SPEED_LIMIT = 3750000

test('Limit download and upload', function (t) {
  t.plan(3)

  var client
  var speed = speedometer()

  series([

    function (cb) {
      client = new WebTorrent({ downloadLimit: DOWNLOAD_SPEED_LIMIT, uploadLimit: UPLOAD_SPEED_LIMIT })

      client.on('error', function (err) {
        t.fail(err)
      })
      client.on('warning', function (err) {
        t.fail(err)
      })

      client.add(fixtures.sintel.torrent)
      cb(null)
    },

    function (cb) {
      client.on('torrent', function (torrent) {
        const stream = torrent.files[0].createReadStream()

        stream.on('data', function (data) {
          // Simply call speed with the amount of bytes transferred
          const bytesPerSecond = speed(data.length)
          console.log(bytesPerSecond + ' bytes/second')
        })

        stream.pipe(devnull())
      })
    }

  ], function (err) {
    t.error(err)

    client.destroy(function (err) {
      t.error(err, 'client destroyed')
    })
  })
})
