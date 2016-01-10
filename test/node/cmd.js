var common = require('../common')
var cp = require('child_process')
var extend = require('xtend')
var parseTorrent = require('parse-torrent')
var path = require('path')
var spawn = require('cross-spawn-async')
var test = require('tape')

var CMD_PATH = path.resolve(__dirname, '..', '..', 'bin', 'cmd.js')
var CMD = 'node ' + CMD_PATH

test('Command line: webtorrent help', function (t) {
  t.plan(6)

  cp.exec(CMD + ' help', function (err, data) {
    t.error(err) // no error, exit code 0
    t.ok(data.toLowerCase().indexOf('usage') !== -1)
  })

  cp.exec(CMD + ' --help', function (err, data) {
    t.error(err) // no error, exit code 0
    t.ok(data.toLowerCase().indexOf('usage') !== -1)
  })

  cp.exec(CMD, function (err, data) {
    t.error(err) // no error, exit code 0
    t.ok(data.toLowerCase().indexOf('usage') !== -1)
  })
})

test('Command line: webtorrent version', function (t) {
  t.plan(6)
  var expectedVersion = require(path.resolve(__dirname, '..', '..', 'package.json')).version + '\n'

  cp.exec(CMD + ' version', function (err, data) {
    t.error(err)
    t.equal(data, expectedVersion)
  })

  cp.exec(CMD + ' --version', function (err, data) {
    t.error(err)
    t.equal(data, expectedVersion)
  })

  cp.exec(CMD + ' -v', function (err, data) {
    t.error(err)
    t.equal(data, expectedVersion)
  })
})

test('Command line: webtorrent info /path/to/file.torrent', function (t) {
  t.plan(3)

  cp.exec(CMD + ' info ' + common.leaves.torrentPath, function (err, data) {
    t.error(err)
    data = JSON.parse(data)
    var parsedTorrent = extend(common.leaves.parsedTorrent)
    delete parsedTorrent.info
    delete parsedTorrent.infoBuffer
    delete parsedTorrent.infoHashBuffer
    t.deepEqual(data, JSON.parse(JSON.stringify(parsedTorrent, undefined, 2)))
  })

  cp.exec(CMD + ' info /bad/path', function (err) {
    t.ok(err instanceof Error)
  })
})

test('Command line: webtorrent info magnet_uri', function (t) {
  t.plan(2)

  var leavesMagnetURI = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&dn=Leaves+of+Grass+by+Walt+Whitman.epub&tr=http%3A%2F%2Ftracker.example.com%2Fannounce&tr=http%3A%2F%2Ftracker.example2.com%2Fannounce&tr=udp%3A%2F%2Ftracker.example3.com%3A3310%2Fannounce&tr=udp%3A%2F%2Ftracker.example4.com%3A80&tr=udp%3A%2F%2Ftracker.example5.com%3A80&tr=udp%3A%2F%2Ftracker.example6.com%3A80'

  cp.exec(CMD + ' info "' + leavesMagnetURI + '"', function (err, data) {
    t.error(err)
    data = JSON.parse(data)
    var parsedTorrent = parseTorrent(leavesMagnetURI)
    delete parsedTorrent.infoHashBuffer
    t.deepEqual(data, JSON.parse(JSON.stringify(parsedTorrent, undefined, 2)))
  })
})

test('Command line: webtorrent create /path/to/file', function (t) {
  t.plan(1)

  var child = spawn('node', [ CMD_PATH, 'create', common.leaves.contentPath ])
  child.on('error', function (err) { t.fail(err) })

  var chunks = []
  child.stdout.on('data', function (chunk) {
    chunks.push(chunk)
  })
  child.stdout.on('end', function () {
    var buf = Buffer.concat(chunks)
    var parsedTorrent = parseTorrent(new Buffer(buf, 'binary'))
    t.deepEqual(parsedTorrent.infoHash, 'd2474e86c95b19b8bcfdb92bc12c9d44667cfa36')
  })
})

test('Command line: webtorrent download <torrent file> (with local content)', function (t) {
  t.plan(2)

  cp.exec(CMD + ' download ' + common.leaves.torrentPath + ' --out test/fixtures', function (err, data) {
    t.error(err)
    t.ok(data.indexOf('successfully') !== -1)
  })
})
