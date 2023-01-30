import { Readable } from 'stream'
import series from 'run-series'
import test from 'tape'
import { Server as Tracker } from 'bittorrent-tracker'
import WebTorrent from '../../index.js'

test('client.seed: stream', t => {
  t.plan(8)

  const tracker = new Tracker({ udp: false, ws: false })

  tracker.on('error', err => { t.fail(err) })
  tracker.on('warning', err => { t.fail(err) })

  let seeder, client, announceUrl, magnetURI

  series([
    cb => {
      tracker.listen(cb)
    },

    cb => {
      const port = tracker.http.address().port
      announceUrl = `http://localhost:${port}/announce`

      seeder = new WebTorrent({ dht: false, lsd: false })

      seeder.on('error', err => { t.fail(err) })
      seeder.on('warning', err => { t.fail(err) })

      const stream = new Readable()
      stream._read = () => {}
      stream.push('HELLO WORLD\n')
      stream.push(null)

      const seederOpts = {
        name: 'hello.txt',
        pieceLength: 5,
        announce: [announceUrl]
      }
      seeder.seed([stream], seederOpts, torrent => {
        magnetURI = torrent.magnetURI
        cb(null)
      })
    },

    cb => {
      client = new WebTorrent({ dht: false, lsd: false })

      client.on('error', err => { t.fail(err) })
      client.on('warning', err => { t.fail(err) })

      client.add(magnetURI, async dl => {
        t.equal(dl.files.length, 1)
        t.equal(dl.files[0].name, 'hello.txt')
        t.equal(dl.files[0].length, 12)
        try {
          const buf = await dl.files[0].arrayBuffer()
          t.equal(Buffer.from(buf).toString('utf8'), 'HELLO WORLD\n', 'content')
        } catch (err) {
          t.error(err)
        }

        cb(null)
      })
    }
  ], err => {
    t.error(err)
    seeder.destroy(err => { t.error(err, 'seeder destroyed') })
    client.destroy(err => { t.error(err, 'client destroyed') })
    tracker.close(() => { t.pass('tracker closed') })
  })
})
