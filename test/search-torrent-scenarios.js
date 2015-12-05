var auto = require('run-auto')
var test = require('tape')
var WebTorrent = require('../')

test('S2.1 Should fetch and download torrent for valid query string', function (t) {
  scenario2_1Test(t)
})

test('S2.2 Should not fetch and download torrent for INVALID query', function (t) {
  scenario2_2Test(t)
})

test('S2.3 Should not fetch and download torrent for query with NO MATCHES', function (t) {
  scenario2_3Test(t)
})

function scenario2_1Test (t) {
  t.plan(4)

  auto({
    remote_client: [ function (cb) {
      var remote_client = new WebTorrent({ dht: false })
      remote_client.on('error', function (err) { 
      	t.fail(err)
      	cb(err, null)
      })
      remote_client.on('warning', function (err) { t.fail(err) })
      remote_client.on('search', function () {
        t.pass('valid torrent search completed')
      })
      remote_client.on('torrent', function (torrent) {
        t.pass('torrent sucessfully initialized')
        cb(null, remote_client)
      })
      remote_client.addBySearch('debian')
    }]
  }, function (err, r) {
    t.error(err)
    r.remote_client.destroy(function () {
      t.pass('remote_client destroyed')
    })
  })
}

function scenario2_2Test (t) {
  t.plan(2)

  auto({

    remote_client: [ function (cb) {
      var remote_client = new WebTorrent({ dht: false })
      remote_client.on('error', function (err) {
        if (err + '' === 'Error: query is invalid') {
          cb(null, remote_client)
        } else {
          t.fail(err)
        }
      })
      remote_client.on('warning', function (err) { t.fail(err) })

      remote_client.addBySearch(2)
    }]
  }, function (err, r) {
    t.error(err)
    r.remote_client.destroy(function () {
      t.pass('remote_client destroyed')
    })
  })
}

function scenario2_3Test (t) {
  t.plan(2)

  auto({

    remote_client: [ function (cb) {
      var remote_client = new WebTorrent({ dht: false })
      remote_client.on('error', function (err) {
        if (err + '' === 'Error: could not find any valid torrents') {
          cb(null, remote_client)
        } else {
          t.fail(err)
        }
      })
      remote_client.on('warning', function (err) { t.fail(err) })

      remote_client.addBySearch('aueouaeoaueoau')
    }]
  }, function (err, r) {
    t.error(err)
    r.remote_client.destroy(function () {
      t.pass('remote_client destroyed')
    })
  })
}
