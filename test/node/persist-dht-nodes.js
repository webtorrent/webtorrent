var test = require('tape')
var tmp = require('tmp')
var fs = require('fs')
var networkAddress = require('network-address')
var DHT = require('bittorrent-dht/server')
var WebTorrent = require('../../')

var loopback = '127.0.0.1'
var localAddress = networkAddress.ipv4()
var port = 9999

test.only('Save DHT state', function (t) {
  t.plan(4)
  var saveFile = tmp.tmpNameSync()
  var dhtServer = new DHT({ bootstrap: false })
  dhtServer.on('error', function (err) { t.fail(err) })
  dhtServer.on('warning', function (err) { t.fail(err) })
  dhtServer.listen(port, function handleServerListening () {
    var client = new WebTorrent({
      dht: { bootstrap: false, host: localAddress },
      dhtState: saveFile
    })
    client.on('error', function (err) { t.fail(err) })
    client.on('warning', function (err) { t.fail(err) })
    client.dht.addNode({ host: loopback, port: port })
    client.dht.on('node', function handleNodeAdded () {
      client.saveDhtState(function handleDhtStateSaved () {
        var dhtStateJson = fs.readFileSync(saveFile)
        var dhtState = JSON.parse(dhtStateJson)
        var nodes = dhtState.nodes
        var node = nodes[0]
        t.equal(node.host, loopback)
        t.equal(node.port, port)
        client.destroy(function handleClientDestroyed (err) {
          t.error(err, 'client destroyed')
        })
        dhtServer.destroy(function handleDhtServerDestroyed (err) {
          t.error(err, 'dht server destroyed')
        })
      })
    })
  })
})
