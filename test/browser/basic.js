var Buffer = require('safe-buffer').Buffer
var test = require('tape')
var WebTorrent = require('../../')

var img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
img.name = 'img.png'

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

  test('client.render() without argument', function (t) {
    t.plan(11)

    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    client.seed(img, function (torrent) {
      var tag = document.createElement('img')
      tag.setAttribute('data-torrent-src', torrent.infoHash)
      document.body.appendChild(tag)

      var tag2 = document.createElement('img')
      tag2.setAttribute('data-torrent-src', torrent.infoHash)
      document.body.appendChild(tag2)

      client.render(function (err) {
        verifyImage(t, err, tag)
        verifyImage(t, err, tag2)
        client.destroy(function (err) {
          t.error(err, 'client destroyed')
        })
      })
    })
  })

  test('client.render() with element argument', function (t) {
    t.plan(7)

    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    client.seed(img, function (torrent) {
      var elemToRender = document.createElement('img')
      elemToRender.setAttribute('data-torrent-src', torrent.infoHash)
      document.body.appendChild(elemToRender)

      var elem2 = document.createElement('img')
      elem2.setAttribute('data-torrent-src', torrent.infoHash)
      document.body.appendChild(elem2)

      client.render({elements: [elemToRender]}, function (err) {
        verifyImage(t, err, elemToRender)
        t.false(elem2.hasAttribute('src'), 'unspecified element should not be altered')
        elem2.remove()
        client.destroy(function (err) {
          t.error(err, 'client destroyed')
        })
      })
    })
  })

  test('client.render() with path', function (t) {
    t.plan(6)

    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    var text = Buffer.from('text')
    text.name = 'text.txt'

    client.seed([text, img], function (torrent) {
      var imgElem = document.createElement('img')
      imgElem.setAttribute('data-torrent-src', torrent.infoHash)
      imgElem.setAttribute('data-torrent-path', 'img.png')
      document.body.appendChild(imgElem)

      var textElem = document.createElement('iframe')
      textElem.setAttribute('data-torrent-src', torrent.infoHash)
      textElem.setAttribute('data-torrent-path', 'text.txt')
      document.body.appendChild(textElem)

      client.render(function (err) {
        // error will be returned if either is rendered to the wrong element
        verifyImage(t, err, imgElem)
        textElem.remove()
        client.destroy(function (err) {
          t.error(err, 'client destroyed')
        })
      })
    })
  })

  test('client.render() fallback on render error', function (t) {
    t.plan(3)

    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    client.seed(img, function (torrent) {
      // use wrong element type to cause error in renderTo()
      var elem = document.createElement('video')
      elem.setAttribute('data-torrent-src', torrent.infoHash)
      elem.setAttribute('data-torrent-fallback', 'fake url')
      document.body.appendChild(elem)

      client.render(function (err) {
        t.ok(err)
        t.equals(elem.getAttribute('src'), 'fake url')
        elem.remove()
        client.destroy(function (err) {
          t.error(err, 'client destroyed')
        })
      })
    })
  })

  test('client.render() fallback on torrent error', function (t) {
    t.plan(3)

    var client = new WebTorrent({ dht: false, tracker: false })

    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })

    client.seed(img, function (torrent) {
      var elem = document.createElement('img')
      elem.setAttribute('data-torrent-src', torrent.infoHash)
      elem.setAttribute('data-torrent-fallback', 'fake url')
      document.body.appendChild(elem)

      client.render(function (err) {
        t.error(err)
        process.nextTick(function () {
          torrent.emit('error')
          process.nextTick(function () {
            t.equals(elem.getAttribute('src'), 'fake url')
            elem.remove()
            client.destroy(function (err) {
              t.error(err, 'client destroyed')
            })
          })
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
