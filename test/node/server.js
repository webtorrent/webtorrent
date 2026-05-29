import fs from 'fs'
import fixtures from 'webtorrent-fixtures'
import createTorrent from 'create-torrent'
import get from 'simple-get'
import { Readable } from 'streamx'
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

test('client.createServer: files with special characters in name', t => {
  t.plan(11)

  const buf1 = Buffer.from('file one content')
  buf1.name = '[test?] file.txt'

  const buf2 = Buffer.from('file two content')
  buf2.name = 'normal.txt'

  createTorrent([buf1, buf2], { name: 'test-torrent' }, (err, torrentBuf) => {
    t.error(err, 'created torrent')

    const client = new WebTorrent({ tracker: false, dht: false, lsd: false })

    client.on('error', err => { t.fail(err) })
    client.on('warning', err => { t.fail(err) })

    client.add(torrentBuf, torrent => {
      t.pass('got "torrent" event')
      const server = client.createServer()

      server.listen(0, () => {
        const port = server.address().port
        t.pass(`server is listening on ${port}`)

        const host = `http://localhost:${port}`
        const path = `webtorrent/${torrent.infoHash}`

        torrent.load(Readable.from([buf1, buf2]), err => {
          t.error(err, 'loaded seed content')

          get.concat(`${host}/${path}/`, (err, res, data) => {
            t.error(err, 'got torrent page')
            data = data.toString()
            t.ok(data.includes('%5Btest%3F%5D%20file.txt'), 'torrent page href has encoded path')
            t.ok(data.includes('[test?] file.txt'), 'torrent page shows display name')

            get.concat(host + torrent.files[0].streamURL, (err, res, data) => {
              t.error(err, `got file via streamURL: ${torrent.files[0].streamURL}`)
              t.deepEqual(data, buf1, 'file content matches')

              server.close(() => {
                t.pass('server closed')
                client.destroy(err => {
                  t.error(err, 'client destroyed')
                })
              })
            })
          })
        })
      })
    })
  })
})
