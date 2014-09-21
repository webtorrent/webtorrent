var cp = require('child_process')
var test = require('tape')

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
