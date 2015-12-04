var fs = require('fs')
var test = require('tape')
var WebTorrent = require('../../')
var AppendTo = require('../../lib/append-to')

var bigBuckFile = fs.readFileSync(__dirname + '/big-buck-bunny.mp4')

test('AppendTo should append and stream if file is video', function (t) {
  t.plan(2)

  //Start Seeding file
  var client = new WebTorrent()
  client.seed(bigBuckFile, { name: 'big-buck-bunny.mp4' }, function(_seedTorrent) {

    client.add(_seedTorrent, function (torrent) {
      torrent.files.forEach(function (file) {

        console.log(file.name)
        AppendTo(file, window.document.getElementsByTagName('body')[0], function (err, currElem) {
          if(err) t.fail(err)

          console.log(currElem)

          t.pass('appended video to html element')
          t.equal(window.document.getElementsByName('video')[0], currElem)
          t.equal(window.document.getElementsByName('video').length, 1)

          t.equal(currElem.nodeName, "VIDEO")
        })
      })
    })
  })
})
