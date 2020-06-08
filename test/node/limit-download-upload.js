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

  var client1, speed = speedometer()

  series([

    function (cb) {
      client1 = new WebTorrent()

      client1.on('error', function (err) {
        t.fail(err)
      })
      client1.on('warning', function (err) {
        t.fail(err)
      })

      client1.add(fixtures.sintel.torrent)
      cb(null)
    },

    function (cb) {

      client1.on('torrent', function (torrent) {

        const stream = torrent.files[0].createReadStream()

        stream.on('data', function (data) {
          // Simply call speed with the amount of bytes transferred
          const bytesPerSecond = speed(data.length)
          console.log(bytesPerSecond + ' bytes/second')
        })

        stream.pipe(devnull())

        /*
        if (torrent.downloadSpeed > 0 && torrent.downloadSpeed <= DOWNLOAD_SPEED_LIMIT) {
                t.pass(`torrent download speed ${torrent.downloadSpeed}/${DOWNLOAD_SPEED_LIMIT}`)
                cb(null);
                return;
            }

            t.fail(`torrent download speed ${torrent.downloadSpeed}/${DOWNLOAD_SPEED_LIMIT}`)
            cb(null);
         */
      })

    },

  ], function (err) {
    t.error(err)

    client1.destroy(function (err) {
      t.error(err, 'client1 destroyed')
    })
  })
})
