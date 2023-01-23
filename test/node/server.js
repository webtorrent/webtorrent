import fs from 'fs'
import fixtures from 'webtorrent-fixtures'
import get from 'simple-get'
import test from 'tape'
import WebTorrent from '../../index.js'

test('client.createServer: programmatic http server', t => {
  t.plan(11)

  const client = new WebTorrent({ tracker: false, dht: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.add(fixtures.leaves.torrent, torrent => {
    t.pass('got "torrent" event')
    const server = client.createServer()

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
      const path = `webtorrent/${torrent.infoHash}`

      // Index page should list files in the torrent
      get.concat(`${host}/${path}/`, (err, res, data) => {
        t.error(err, `got http response for /${path}`)
        data = data.toString()
        t.ok(data.includes('Leaves of Grass by Walt Whitman.epub'))

        // Verify file content for first (and only) file
        get.concat(`${host}/${path}/${torrent.files[0].path}`, (err, res, data) => {
          t.error(err, `got http response for /${path}/${torrent.files[0].path}`)
          t.deepEqual(data, fixtures.leaves.content)

          // test streamURL
          get.concat(host + torrent.files[0].streamURL, (err, res, data) => {
            t.error(err, `got http response for ${torrent.files[0].streamURL} via streamURL`)
            t.deepEqual(data, fixtures.leaves.content)

            close()
          })
        })
      })
    })
  })
})
