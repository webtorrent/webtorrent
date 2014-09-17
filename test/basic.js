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

test('Command line: --help', function (t) {
  t.plan(2)

  var bin = __dirname + '/../bin/cmd.js --help'
  cp.exec(bin, function (err, data) {
    t.error(err) // no error, exit code 0
    t.ok(data.indexOf('usage') !== 0)
  })
})

test('Command line: -v --version', function (t) {
  t.plan(4)
  var expectedVersion = require(__dirname + '/../package.json').version + '\n'

  var bin = __dirname + '/../bin/cmd.js --version'
  cp.exec(bin, function (err, data) {
    t.error(err) // no error, exit code 0
    t.equal(data, expectedVersion)
  })

  bin = __dirname + '/../bin/cmd.js -v'
  cp.exec(bin, function (err, data) {
    t.error(err) // no error, exit code 0
    t.equal(data, expectedVersion)
  })
})
