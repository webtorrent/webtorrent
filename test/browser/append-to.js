var fs = require('fs')
var test = require('tape')
var WebTorrent = require('../../')
var AppendTo = require('../../lib/append-to')

var bigBuckFile = fs.readFileSync(__dirname + '/big-buck-bunny.mp4')

test('AppendTo should append and stream if file is video', function (t) {
  t.plan(3)

  // Start Seeding file
  var client = new WebTorrent()
  client.seed(bigBuckFile, { name: 'big-buck-bunny.mp4' }, function (_seedTorrent) {
    client.add(_seedTorrent, function (torrent) {
      torrent.files.forEach(function (file) {
        AppendTo(file, window.document.getElementsByTagName('body')[0], function (err, currElem) {
          if (err) t.fail(err)
          currElem.style.visibility = 'hidden'

          t.equal(window.document.getElementsByTagName('video')[0], currElem)
          t.equal(window.document.getElementsByTagName('video').length, 1)

          t.equal(currElem.nodeName, 'VIDEO')
        })
      })
    })
  })
})
