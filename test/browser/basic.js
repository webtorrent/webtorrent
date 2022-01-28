const test = require('tape')
const WebTorrent = require('../../index.js')

const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
img.name = 'img.png'

function verifyImage (t, err, elem) {
  t.error(err)
  t.ok(typeof elem.src === 'string')
  t.ok(elem.src.includes('blob'))
  t.equal(elem.parentElement.nodeName, 'BODY')
  t.ok(elem.alt, 'file.name')
  elem.remove()
}

// The image append/render tests don't work in electron, so skip them
// TODO get these working
// logic taken from https://github.com/atom/electron/issues/2288#issuecomment-123147993
if (!(global && global.process && global.process.versions && global.process.versions.electron)) {
  test('image append w/ query selector', t => {
    t.plan(6)

    const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

    client.on('error', err => { t.fail(err) })
    client.on('warning', err => { t.fail(err) })

    client.seed(img, torrent => {
      torrent.files[0].appendTo('body', (err, elem) => {
        verifyImage(t, err, elem)
        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
  })

  test('image append w/ element', t => {
    t.plan(6)

    const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

    client.on('error', err => { t.fail(err) })
    client.on('warning', err => { t.fail(err) })

    client.seed(img, torrent => {
      torrent.files[0].appendTo(document.body, (err, elem) => {
        verifyImage(t, err, elem)
        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
  })

  test('image render w/ query selector', t => {
    t.plan(6)

    const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

    client.on('error', err => { t.fail(err) })
    client.on('warning', err => { t.fail(err) })

    const tag = document.createElement('img')
    tag.className = 'tag'
    document.body.appendChild(tag)

    client.seed(img, torrent => {
      torrent.files[0].renderTo('img.tag', (err, elem) => {
        verifyImage(t, err, elem)
        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
  })

  test('image render w/ element', t => {
    t.plan(6)

    const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

    client.on('error', err => { t.fail(err) })
    client.on('warning', err => { t.fail(err) })

    const tag = document.createElement('img')
    document.body.appendChild(tag)

    client.seed(img, torrent => {
      torrent.files[0].renderTo(tag, (err, elem) => {
        verifyImage(t, err, elem)
        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
  })
}

test('WebTorrent.WEBRTC_SUPPORT', t => {
  t.plan(2)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  t.equal(WebTorrent.WEBRTC_SUPPORT, true)

  client.destroy(err => {
    t.error(err, 'client destroyed')
  })
})
