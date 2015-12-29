var fs = require('fs')
var test = require('tape')
var WebTorrent = require('../')

var img = fs.readFileSync(__dirname + '/../img/logo.png')
img.name = 'logo.png'

function verifyImage (t, err, elem) {
  t.error(err)
  t.ok(typeof elem.src === 'string')
  t.ok(elem.src.indexOf('blob') !== -1)
  t.equal(elem.parentElement.nodeName, 'BODY')
  t.ok(elem.alt, 'file.name')
  elem.remove()
}

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
