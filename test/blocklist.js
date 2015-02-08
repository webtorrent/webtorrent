var fs = require('fs')
var http = require('http')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var WebTorrent = require('../')
var zlib = require('zlib')

var blocklistPath = __dirname + '/content/blocklist.txt'
var blocklistGzipPath = __dirname + '/content/blocklist.txt.gz'

var leavesTorrent = fs.readFileSync(__dirname + '/torrents/leaves.torrent')
var leavesParsed = parseTorrent(leavesTorrent)

// remove trackers from .torrent file
leavesParsed.announce = []
leavesParsed.announceList = []

function assertBlocked (t, torrent, addr) {
  torrent.once('blocked-peer', function (_addr) {
    t.equal(addr, _addr)
  })
  t.notOk(torrent.addPeer(addr))
}

function assertReachable (t, torrent, addr) {
  torrent.once('peer', function (_addr) {
    t.equal(addr, _addr)
  })
  t.ok(torrent.addPeer(addr))
}

test('blocklist (single IP)', function (t) {
  t.plan(8)

  var client = new WebTorrent({
    dht: false,
    tracker: false,
    blocklist: [ '1.2.3.4' ]
  })
  .on('error', function (err) { t.fail(err) })
  .on('ready', function () {
    var torrent = client.add(leavesParsed)

    assertBlocked(t, torrent, '1.2.3.4:1234')
    assertBlocked(t, torrent, '1.2.3.4:6969')
    assertReachable(t, torrent, '1.1.1.1:1234')
    assertReachable(t, torrent, '1.1.1.1:6969')

    client.destroy()
  })
})

test('blocklist (array of IPs)', function (t) {
  t.plan(12)

  var client = new WebTorrent({
    dht: false,
    tracker: false,
    blocklist: [ '1.2.3.4', '5.6.7.8' ]
  })
  .on('error', function (err) { t.fail(err) })
  .on('ready', function () {
    var torrent = client.add(leavesParsed)

    assertBlocked(t, torrent, '1.2.3.4:1234')
    assertBlocked(t, torrent, '1.2.3.4:6969')
    assertBlocked(t, torrent, '5.6.7.8:1234')
    assertBlocked(t, torrent, '5.6.7.8:6969')
    assertReachable(t, torrent, '1.1.1.1:1234')
    assertReachable(t, torrent, '1.1.1.1:6969')

    client.destroy()
  })
})

// 48 asserts
function assertList (t, torrent) {
  assertBlocked(t, torrent, '1.2.3.0:1234')
  assertBlocked(t, torrent, '1.2.3.0:6969')

  assertBlocked(t, torrent, '1.2.3.1:1234')
  assertBlocked(t, torrent, '1.2.3.1:6969')

  assertBlocked(t, torrent, '1.2.3.1:1234')
  assertBlocked(t, torrent, '1.2.3.1:6969')

  assertBlocked(t, torrent, '1.2.3.254:1234')
  assertBlocked(t, torrent, '1.2.3.254:6969')

  assertBlocked(t, torrent, '1.2.3.255:1234')
  assertBlocked(t, torrent, '1.2.3.255:6969')

  assertBlocked(t, torrent, '5.6.7.0:1234')
  assertBlocked(t, torrent, '5.6.7.0:6969')

  assertBlocked(t, torrent, '5.6.7.128:1234')
  assertBlocked(t, torrent, '5.6.7.128:6969')

  assertBlocked(t, torrent, '5.6.7.255:1234')
  assertBlocked(t, torrent, '5.6.7.255:6969')

  assertReachable(t, torrent, '1.1.1.1:1234')
  assertReachable(t, torrent, '1.1.1.1:6969')

  assertReachable(t, torrent, '2.2.2.2:1234')
  assertReachable(t, torrent, '2.2.2.2:6969')

  assertReachable(t, torrent, '1.2.4.0:1234')
  assertReachable(t, torrent, '1.2.4.0:6969')

  assertReachable(t, torrent, '1.2.2.0:1234')
  assertReachable(t, torrent, '1.2.2.0:6969')
}

test('blocklist (array of IP ranges)', function (t) {
  t.plan(48)
  var client = new WebTorrent({
    dht: false,
    tracker: false,
    blocklist: [
      { start: '1.2.3.0', end: '1.2.3.255' },
      { start: '5.6.7.0', end: '5.6.7.255' }
    ]
  })
  .on('error', function (err) { t.fail(err) })
  .on('ready', function () {
    var torrent = client.add(leavesParsed)

    assertList(t, torrent)

    client.destroy()
  })
})

test('blocklist (http url)', function (t) {
  t.plan(49)
  var server = http.createServer(function (req, res) {
    // Check that WebTorrent declares a user agent
    t.equal(req.headers['user-agent'], 'WebTorrent (http://webtorrent.io)')

    fs.createReadStream(blocklistPath)
      .pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var url = 'http://127.0.0.1:' + port
    var client = new WebTorrent({
      dht: false,
      tracker: false,
      blocklist: url
    })
    .on('error', function (err) { t.fail(err) })
    .on('ready', function () {
      var torrent = client.add(leavesParsed)

      assertList(t, torrent)

      client.destroy()
      server.close()
    })
  })
})

test('blocklist (http url with gzip encoding)', function (t) {
  t.plan(49)
  var server = http.createServer(function (req, res) {
    // Check that WebTorrent declares a user agent
    t.equal(req.headers['user-agent'], 'WebTorrent (http://webtorrent.io)')

    res.setHeader('content-encoding', 'gzip')
    fs.createReadStream(blocklistPath)
      .pipe(zlib.createGzip())
      .pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var url = 'http://127.0.0.1:' + port
    var client = new WebTorrent({
      dht: false,
      tracker: false,
      blocklist: url
    })
    .on('error', function (err) { t.fail(err) })
    .on('ready', function () {
      var torrent = client.add(leavesParsed)

      assertList(t, torrent)

      client.destroy()
      server.close()
    })
  })
})

test('blocklist (http url with deflate encoding)', function (t) {
  t.plan(49)
  var server = http.createServer(function (req, res) {
    // Check that WebTorrent declares a user agent
    t.equal(req.headers['user-agent'], 'WebTorrent (http://webtorrent.io)')

    res.setHeader('content-encoding', 'deflate')
    fs.createReadStream(blocklistPath)
      .pipe(zlib.createDeflate())
      .pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var url = 'http://127.0.0.1:' + port
    var client = new WebTorrent({
      dht: false,
      tracker: false,
      blocklist: url
    })
    .on('error', function (err) { t.fail(err) })
    .on('ready', function () {
      var torrent = client.add(leavesParsed)

      assertList(t, torrent)

      client.destroy()
      server.close()
    })
  })
})

test('blocklist (fs path)', function (t) {
  t.plan(48)
  var client = new WebTorrent({
    dht: false,
    tracker: false,
    blocklist: blocklistPath
  })
  .on('error', function (err) { t.fail(err) })
  .on('ready', function () {
    var torrent = client.add(leavesParsed)

    assertList(t, torrent)

    client.destroy()
  })
})

test('blocklist (fs path with gzip)', function (t) {
  t.plan(48)
  var client = new WebTorrent({
    dht: false,
    tracker: false,
    blocklist: blocklistGzipPath
  })
  .on('error', function (err) { t.fail(err) })
  .on('ready', function () {
    var torrent = client.add(leavesParsed)

    assertList(t, torrent)

    client.destroy()
  })
})
