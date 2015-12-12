var test = require('tape')
var WebTorrent = require('../')

test('client download/upload throttle setting and rate reporting', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.throttleDownload(100000)
  client.throttleUpload(10000)

  t.equal(client.downloadThrottleRate, 100000)
  t.equal(client.uploadThrottleRate, 10000)

  client.destroy()
  t.end()
})

test('client download/upload throttle setting bad values', function (t) {
  var client = new WebTorrent({ dht: false, tracker: false })

  client.on('error', function (err) { t.fail(err) })
  client.on('warning', function (err) { t.fail(err) })

  client.throttleDownload("I'm a string")
  client.throttleUpload(NaN)

  t.equal(client.downloadThrottleRate, undefined)
  t.equal(client.uploadThrottleRate, undefined)

  client.destroy()
  t.end()
})
