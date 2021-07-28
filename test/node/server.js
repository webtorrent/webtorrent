const fixtures = require('webtorrent-fixtures')
const fs = require('fs')
const get = require('simple-get')
const test = require('tape')
const WebTorrent = require('../../')

test('torrent.createServer: programmatic http server', t => {
  t.plan(9)

  const client = new WebTorrent({ tracker: false, dht: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.add(fixtures.leaves.torrent, torrent => {
    t.pass('got "torrent" event')
    const server = torrent.createServer()

    server.listen(0, () => {
      const port = server.address().port
      t.pass(`server is listening on ${port}`)

      let open = 2
      const close = () => {
        if (--open === 0) {
          server.close(() => {
            t.pass('server closed')
          })
          client.destroy(err => {
            t.error(err, 'client destroyed')
          })
        }
      }

      // Seeding after server is created should work
      torrent.load(fs.createReadStream(fixtures.leaves.contentPath), err => {
        t.error(err, 'loaded seed content into torrent')
        close()
      })

      const host = `http://localhost:${port}`

      // Index page should list files in the torrent
      get.concat(`${host}/`, (err, res, data) => {
        t.error(err, 'got http response for /')
        data = data.toString()
        t.ok(data.includes('Leaves of Grass by Walt Whitman.epub'))

        // Verify file content for first (and only) file
        get.concat(`${host}/0`, (err, res, data) => {
          t.error(err, 'got http response for /0')
          t.deepEqual(data, fixtures.leaves.content)

          close()
        })
      })
    })
  })
})
