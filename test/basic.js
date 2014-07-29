var cp = require('child_process')
var test = require('tape')
var WebTorrent = require('../')

/**
 * Extensive bittorrent functionality tests are contained within dependencies like
 * `bittorrent-client`, `bitorrent-protocol`, etc.
 */

test('Module usage (sanity check)', function (t) {
  var client = new WebTorrent()
  t.equal(typeof client.add, 'function', 'client.add exists')
  client.destroy(function () {
    t.pass('client.destroy works')
    t.end()
  })
})

test('Command line usage (sanity check)', function (t) {
  var bin = __dirname + '/../bin/cmd.js --help'
  cp.exec(bin, function (err) {
    t.error(err) // no error, exit code 0
    t.end()
  })
})
