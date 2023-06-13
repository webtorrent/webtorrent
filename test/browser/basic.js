import test from 'tape'
import WebTorrent from '../../index.js'

test('WebTorrent.WEBRTC_SUPPORT', t => {
  t.plan(2)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  t.equal(WebTorrent.WEBRTC_SUPPORT, true)

  client.destroy(err => {
    t.error(err, 'client destroyed')
  })
})
