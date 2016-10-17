var WebTorrent = require('../../')

exports.wrapTest = function (test, str, func) {
  test('ipv4 ' + str, function (t) {
    func(t, false)
    if (t._plan) {
      t.plan(t._plan + 1)
    }

    t.test('ipv6 ' + str, function (newT) {
      func(newT, true)
    })
  })
}

exports.localHost = function (ipv6, plainIpv6) {
  if (ipv6) {
    if (!plainIpv6) {
      return '[::1]'
    }
    return '::1'
  }
  return '127.0.0.1'
}

exports.newClient = function (ipv6, port) {
  var dhtOpts = { bootstrap: this.localHost(ipv6) + ':' + port }

  return new WebTorrent({
    tracker: false,
    dht: ipv6 ? false : dhtOpts,
    dht6: ipv6 ? dhtOpts : false
  })
}
