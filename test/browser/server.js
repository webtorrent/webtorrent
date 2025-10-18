import test from 'tape'
import WebTorrent from '../../index.js'
import fixtures from 'webtorrent-fixtures'
import get from 'simple-get'

// Check if we're in an environment that supports service workers
// Feature detection is better than user agent sniffing
const hasServiceWorkerSupport = typeof navigator !== 'undefined' &&
                               'serviceWorker' in navigator &&
                               typeof ServiceWorker !== 'undefined'

if (hasServiceWorkerSupport) {
  const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  img.name = 'img.png'
  test('SW Registration and errors', t => {
    const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

    client.on('error', err => { t.fail(err) })
    client.on('warning', err => { t.fail(err) })

    client.seed(img, torrent => {
      t.throws(() => {
        return torrent.files[0].streamURL
      }, 'Stream URL without server')
      function checkState (worker, controller) {
        if (worker.state !== 'activated') {
          t.throws(() => {
            client.createServer({ controller })
          }, 'Invalid worker state')
        } else {
          client.createServer({ controller })
          t.throws(() => {
            client.createServer({ controller })
          }, 'Server already registered')
          t.ok(torrent.files[0].streamURL, 'get file URL')
          client.destroy(err => {
            t.error(err, 'client destroyed')
            t.end()
          })

          return true
        }
      }
      try {
        navigator.serviceWorker.register('/sw.min.js', { scope: './' }).then(reg => {
          const worker = reg.active || reg.waiting || reg.installing
          if (!checkState(worker)) {
            worker.addEventListener('statechange', ({ target }) => checkState(target, reg))
          }
        })
      } catch (e) {
        t.err(e)
      }
    })
  })
  test('SW renderer image', t => {
    t.plan(4)
    const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

    client.on('error', err => { t.fail(err) })
    client.on('warning', err => { t.fail(err) })
    try {
      navigator.serviceWorker.getRegistration().then(controller => {
        client.createServer({ controller })
        client.seed(img, async torrent => {
          const src = torrent.files[0].streamURL
          t.ok(typeof src === 'string', 'source is string')
          t.ok(src.endsWith('/webtorrent/db19b51fe04aaf14fd4c9be77f5eeeb2d8789b5c/img.png'), 'source URL is correct')

          const res = await fetch(torrent.files[0].streamURL)
          const data = new Uint8Array(await res.arrayBuffer())
          const original = new Uint8Array(img)
          t.deepEqual(data, original)
          client.destroy(err => {
            t.error(err, 'client destroyed')
          })
        })
      })
    } catch (e) {
      t.err(e)
    }
  })
  // this hangs on CI
  // test('SW renderer video', t => {
  //   t.plan(4)
  //   const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  //   client.on('error', err => { t.fail(err) })
  //   client.on('warning', err => { t.fail(err) })
  //   const video = document.createElement('video')
  //   try {
  //     navigator.serviceWorker.getRegistration().then(controller => {
  //       client.createServer({ controller })
  //       client.add('https://webtorrent.io/torrents/sintel.torrent', torrent => {
  //         video.addEventListener('loadedmetadata', () => {
  //           t.equal(Math.floor(video.duration), 888, 'Video metadata is ok')
  //           client.destroy(err => {
  //             t.error(err, 'client destroyed')
  //           })
  //         })
  //         const file = torrent.files.find(file => file.name.endsWith('.mp4'))
  //         file.streamTo(video)
  //         t.ok(typeof video.src === 'string', 'source is string')
  //         t.ok(video.src.endsWith('/webtorrent/08ada5a7a6183aae1e09d831df6748d566095a10/Sintel/Sintel.mp4'), 'source URL is correct')
  //         video.load()
  //       })
  //     })
  //   } catch (e) {
  //     t.err(e)
  //   }
  // })

  test('client.createServer: programmatic http server [node-like usage]', t => {
    t.plan(8)

    const client = new WebTorrent({ tracker: false, dht: false, lsd: false })

    client.on('error', err => { t.fail(err) })
    client.on('warning', err => { t.fail(err) })

    client.seed(fixtures.leaves.content, torrent => {
      t.pass('got "torrent" event')
      navigator.serviceWorker.getRegistration().then(controller => {
        const server = client.createServer({ controller })

        server.listen(0, () => {
          const port = server.address().port
          t.pass(`server is listening on ${port}`)

          // Seeding after server is created should work

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
              get.concat(torrent.files[0].streamURL, (err, res, data) => {
                t.error(err, `got http response for ${torrent.files[0].streamURL} via streamURL`)
                t.deepEqual(data, fixtures.leaves.content)

                server.close(() => {
                  t.pass('server closed')
                })
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
} else {
  // For environments without service worker support (e.g., Electron)
  // Run a basic test to verify WebTorrent works without service workers
  test('WebTorrent basic functionality (no service workers)', t => {
    const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

    client.on('error', err => { t.fail(err) })
    client.on('warning', err => { t.fail(err) })

    const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    img.name = 'img.png'

    client.seed(img, torrent => {
      t.ok(torrent.files.length === 1, 'torrent has 1 file')
      t.ok(torrent.files[0].name === 'img.png', 'file has correct name')
      t.ok(torrent.files[0].length > 0, 'file has content')

      client.destroy(err => {
        t.error(err, 'client destroyed')
        t.end()
      })
    })
  })
}
