var Buffer = require('safe-buffer').Buffer
var test = require('tape')
var WebTorrent = require('../../')
var fs = require('fs')

var data = fs.readFileSync('test/browser/data/data2.3MB.base64')
var img = Buffer.from(data, 'base64')
img.name = 'img.png'

var data2 = fs.readFileSync('test/browser/data/data2.5MB.base64')
var img2 = Buffer.from(data2, 'base64')
img2.name = 'img2.png'

var data3 = fs.readFileSync('test/browser/data/data2.7MB.base64')
var img3 = Buffer.from(data3, 'base64')
img3.name = 'img3.png'

function verifyImage (t, err, elem) {
  t.error(err)
  t.ok(typeof elem.src === 'string')
  t.ok(elem.src.indexOf('blob') !== -1)
  t.equal(elem.parentElement.nodeName, 'BODY')
  t.ok(elem.alt, 'file.name')
  elem.remove()
}

// The image append/render tests don't work in electron, so skip them
// TODO get these working
// logic taken from https://github.com/atom/electron/issues/2288#issuecomment-123147993
if (!(global && global.process && global.process.versions && global.process.versions.electron)) {
  test('image append w/ query selector', function (t) {
    t.plan(6)

    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    client.seed(img, function (torrent) {
      torrent.files[0].appendTo('body', function (err, elem) {
        verifyImage(t, err, elem)
        client.destroy(function (err) {
          t.error(err, 'client destroyed')
        })
      })
    })
  })

  test('image append w/ element', function (t) {
    t.plan(6)

    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    client.seed(img, function (torrent) {
      torrent.files[0].appendTo(document.body, function (err, elem) {
        verifyImage(t, err, elem)
        client.destroy(function (err) {
          t.error(err, 'client destroyed')
        })
      })
    })
  })

  test('image render w/ query selector', function (t) {
    t.plan(6)

    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    var tag = document.createElement('img')
    tag.className = 'tag'
    document.body.appendChild(tag)

    client.seed(img, function (torrent) {
      torrent.files[0].renderTo('img.tag', function (err, elem) {
        verifyImage(t, err, elem)
        client.destroy(function (err) {
          t.error(err, 'client destroyed')
        })
      })
    })
  })

  test('image render w/ element', function (t) {
    t.plan(6)

    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    var tag = document.createElement('img')
    document.body.appendChild(tag)

    client.seed(img, function (torrent) {
      torrent.files[0].renderTo(tag, function (err, elem) {
        verifyImage(t, err, elem)
        client.destroy(function (err) {
          t.error(err, 'client destroyed')
        })
      })
    })
  })
}

test('WebTorrent.WEBRTC_SUPPORT', function (t) {
  t.plan(2)

  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  t.equal(WebTorrent.WEBRTC_SUPPORT, true)

  client.destroy(function (err) {
    t.error(err, 'client destroyed')
  })
})

test('seed Multiple Torrents', function (t) {
  t.plan(3)
  var client = new WebTorrent({ dht: false, tracker: false })
  client.seed(img, function (torrent) {
    t.equal(torrent.infoHash,'fe83c6629dc58cc08b7809256000ad068a167b95')
  })
  client.seed(img2, function (torrent) {
    t.equal(torrent.infoHash, 'fd5c8c050571e1f8c369541ed5560f7696931e3f')
  })
  client.seed(img3, function (torrent) {
    t.equal(torrent.infoHash,'2b12aaf42343ce8dc999cfe36a3da318b22bacf2')
  })
})