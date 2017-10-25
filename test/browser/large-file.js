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

var data3 = fs.readFileSync('test/browser/data/data2.5MB.base64')
var img3 = Buffer.from(data3, 'base64')
img3.name = 'img3.png'

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
    t.equal(torrent.infoHash,'c36facf1ca9d3071a81bc8f85f77d3fa3b684048')
  })
})