import test from 'tape'
import WebTorrent from '../../index.js'
import fixtures from 'webtorrent-fixtures'
import SimplePeer from '@thaunknown/simple-peer'
import { bytesToIP } from '../../lib/bep40.js'

test('client._recordIP tracks IP observations and picks most frequent', t => {
  const client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', err => { t.fail(err) })

  t.equal(client._bestLocalIP, null, 'no IP observed yet')

  client._recordIP('10.0.0.1')
  t.equal(client._bestLocalIP, '10.0.0.1', 'first IP becomes best')

  client._recordIP('10.0.0.1')
  t.equal(client._bestLocalIP, '10.0.0.1', 'same IP stays best')

  client._recordIP('10.0.0.2')
  t.equal(client._bestLocalIP, '10.0.0.1', '10.0.0.1 still best (2 vs 1)')

  client._recordIP('10.0.0.2')
  client._recordIP('10.0.0.2')
  t.equal(client._bestLocalIP, '10.0.0.2', '10.0.0.2 becomes best after exceeding')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('_recordIP ignores invalid values', t => {
  const client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', err => { t.fail(err) })

  client._recordIP(null)
  client._recordIP(undefined)
  client._recordIP(123)
  client._recordIP('')

  t.equal(client._bestLocalIP, null, 'invalid IPs ignored')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('yourip sent in extended handshake to connected peer', t => {
  t.plan(4)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client1.on('error', err => { t.fail(err) })
  client2.on('error', err => { t.fail(err) })

  client1.on('listening', () => {
    client1.add(fixtures.leaves.parsedTorrent.infoHash)

    const torrent2 = client2.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent2.on('wire', wire => {
      wire.on('extended', (type, handshake) => {
        if (type !== 'handshake') return

        t.ok(handshake.yourip, 'received yourip in extended handshake')
        t.equal(bytesToIP(handshake.yourip), '127.0.0.1', 'yourip is remote peers IP')

        client1.destroy(err => { t.error(err, 'client1 destroyed') })
        client2.destroy(err => { t.error(err, 'client2 destroyed') })
      })
    })

    torrent2.on('infoHash', () => {
      torrent2.addPeer(`127.0.0.1:${client1.address().port}`)
    })
  })
})

test('extended handshake yourip is recorded by receiving peer', t => {
  t.plan(5)

  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client1.on('error', err => { t.fail(err) })
  client2.on('error', err => { t.fail(err) })

  client1.on('listening', () => {
    client1.add(fixtures.leaves.parsedTorrent.infoHash)

    const torrent2 = client2.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent2.on('infoHash', () => {
      t.equal(client2._bestLocalIP, null, 'no IP observed before connection')

      torrent2.addPeer(`127.0.0.1:${client1.address().port}`)

      torrent2.on('wire', wire => {
        wire.on('extended', (type, handshake) => {
          if (type !== 'handshake') return
          t.ok(client2._bestLocalIP, 'bestLocalIP was set after extended handshake')
          t.equal(client2._bestLocalIP, '127.0.0.1', 'recorded IP is 127.0.0.1')
          client1.destroy(err => { t.error(err, 'client1 destroyed') })
          client2.destroy(err => { t.error(err, 'client2 destroyed') })
        })
      })
    })
  })
})

test('extended handshake yourip aggregated across multiple peers', t => {
  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  const client3 = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client1.on('error', err => { t.fail(err) })
  client2.on('error', err => { t.fail(err) })
  client3.on('error', err => { t.fail(err) })

  client1.on('listening', () => {
    const torrent1 = client1.add(fixtures.leaves.parsedTorrent.infoHash)

    client2.add(fixtures.leaves.parsedTorrent.infoHash)
    client3.add(fixtures.leaves.parsedTorrent.infoHash)

    let extendedCount = 0
    torrent1.on('wire', wire => {
      wire.on('extended', (type, handshake) => {
        if (type !== 'handshake') return
        extendedCount++
        t.pass('client1 extended handshake received')

        if (extendedCount === 2) {
          t.equal(client1._ipObservations['127.0.0.1'], 2, 'two peers reported same local IP')
          t.equal(client1._bestLocalIP, '127.0.0.1', 'bestLocalIP set from both peers')
          client1.destroy(() => {
            client2.destroy(() => {
              client3.destroy(() => {
                t.end()
              })
            })
          })
        }
      })
    })

    let readyCount = 0
    const onReady = () => {
      readyCount++
      if (readyCount === 2) {
        client2.torrents[0].addPeer(`127.0.0.1:${client1.address().port}`)
        client3.torrents[0].addPeer(`127.0.0.1:${client1.address().port}`)
      }
    }
    client2.torrents[0].on('infoHash', onReady)
    client3.torrents[0].on('infoHash', onReady)
  })
})

test('tracker update with external ip records IP via real handler', t => {
  t.plan(4)

  const client = new WebTorrent({ dht: false, lsd: false, natUpnp: false, natPmp: false })
  client.on('error', err => { t.fail(err) })

  client.on('listening', () => {
    const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent.on('infoHash', () => {
      setImmediate(() => {
        t.ok(torrent.discovery?.tracker, 'tracker exists after _startDiscovery')
        t.equal(client._bestLocalIP, null, 'no IP observed before tracker update')

        torrent.discovery.tracker.emit('update', { 'external ip': '198.51.100.2' })

        t.equal(client._bestLocalIP, '198.51.100.2', 'external ip recorded via real handler')

        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
  })
})

test('tracker update with your_ip records IP via real handler', t => {
  t.plan(4)

  const client = new WebTorrent({ dht: false, lsd: false, natUpnp: false, natPmp: false })
  client.on('error', err => { t.fail(err) })

  client.on('listening', () => {
    const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent.on('infoHash', () => {
      setImmediate(() => {
        t.ok(torrent.discovery?.tracker, 'tracker exists after _startDiscovery')
        t.equal(client._bestLocalIP, null, 'no IP observed before tracker update')

        torrent.discovery.tracker.emit('update', { your_ip: '198.51.100.3' })

        t.equal(client._bestLocalIP, '198.51.100.3', 'your_ip recorded via real handler')

        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
  })
})

test('tracker update external ip takes priority over your_ip via real handler', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, lsd: false, natUpnp: false, natPmp: false })
  client.on('error', err => { t.fail(err) })

  client.on('listening', () => {
    const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent.on('infoHash', () => {
      setImmediate(() => {
        t.ok(torrent.discovery?.tracker, 'tracker exists after _startDiscovery')

        torrent.discovery.tracker.emit('update', { 'external ip': '198.51.100.2', your_ip: '10.0.0.1' })

        t.equal(client._bestLocalIP, '198.51.100.2', 'external ip preferred over your_ip')

        client.destroy(err => {
          t.error(err, 'client destroyed')
        })
      })
    })
  })
})

test('WebRTC yourip sent in extended handshake between two torrent clients', async t => {
  const clientA = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  clientA.on('error', err => { t.fail(err) })
  const clientB = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  clientB.on('error', err => { t.fail(err) })

  await Promise.all([
    new Promise(resolve => clientA.on('listening', resolve)),
    new Promise(resolve => clientB.on('listening', resolve))
  ])

  const torrentA = clientA.add(fixtures.leaves.parsedTorrent.infoHash)
  const torrentB = clientB.add(fixtures.leaves.parsedTorrent.infoHash)

  await Promise.all([
    new Promise(resolve => torrentA.on('infoHash', resolve)),
    new Promise(resolve => torrentB.on('infoHash', resolve))
  ])

  const pA = new SimplePeer({ initiator: true })
  const pB = new SimplePeer({})

  pA.on('error', () => {})
  pB.on('error', () => {})
  pA.on('signal', data => pB.signal(data))
  pB.on('signal', data => pA.signal(data))

  await Promise.all([
    new Promise(resolve => pA.on('connect', resolve)),
    new Promise(resolve => pB.on('connect', resolve))
  ])
  await new Promise(resolve => setImmediate(resolve))

  t.ok(pA.remoteAddress, 'pA has remoteAddress')
  t.ok(pB.remoteAddress, 'pB has remoteAddress')

  const gotExtendedB = new Promise((resolve, reject) => {
    torrentB.on('wire', wire => {
      wire.once('extended', (type, handshake) => {
        if (type !== 'handshake') return
        resolve(handshake)
      })
      wire.once('error', reject)
    })
    torrentB.on('error', reject)
  })

  torrentB.addPeer(pB)
  torrentA.addPeer(pA)

  const handshakeB = await gotExtendedB

  t.ok(handshakeB.yourip, 'clientB received yourip in extended handshake')
  t.equal(bytesToIP(handshakeB.yourip), pA.remoteAddress, 'clientB yourip is pA remoteAddress')

  await Promise.all([
    new Promise(resolve => clientA.destroy(resolve)),
    new Promise(resolve => clientB.destroy(resolve))
  ])
  t.pass('clients destroyed')
})

test('WebRTC extended handshake yourip recorded on both sides', async t => {
  const clientA = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  clientA.on('error', err => { t.fail(err) })
  const clientB = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  clientB.on('error', err => { t.fail(err) })

  await Promise.all([
    new Promise(resolve => clientA.on('listening', resolve)),
    new Promise(resolve => clientB.on('listening', resolve))
  ])

  const torrentA = clientA.add(fixtures.leaves.parsedTorrent.infoHash)
  const torrentB = clientB.add(fixtures.leaves.parsedTorrent.infoHash)

  await Promise.all([
    new Promise(resolve => torrentA.on('infoHash', resolve)),
    new Promise(resolve => torrentB.on('infoHash', resolve))
  ])

  t.equal(clientA._bestLocalIP, null, 'no IP observed on A before WebRTC connection')
  t.equal(clientB._bestLocalIP, null, 'no IP observed on B before WebRTC connection')

  const pA = new SimplePeer({ initiator: true })
  const pB = new SimplePeer({})

  pA.on('error', () => {})
  pB.on('error', () => {})
  pA.on('signal', data => pB.signal(data))
  pB.on('signal', data => pA.signal(data))

  await new Promise(resolve => pB.on('connect', resolve))

  const gotExtendedA = new Promise((resolve, reject) => {
    torrentA.on('wire', wire => {
      wire.once('extended', (type, handshake) => {
        if (type !== 'handshake') return
        resolve(handshake)
      })
      wire.once('error', reject)
    })
    torrentA.on('error', reject)
  })
  const gotExtendedB = new Promise((resolve, reject) => {
    torrentB.on('wire', wire => {
      wire.once('extended', (type, handshake) => {
        if (type !== 'handshake') return
        resolve(handshake)
      })
      wire.once('error', reject)
    })
    torrentB.on('error', reject)
  })

  torrentB.addPeer(pB)
  torrentA.addPeer(pA)

  await Promise.all([gotExtendedA, gotExtendedB])

  t.ok(clientA._bestLocalIP, 'bestLocalIP set on clientA after WebRTC')
  t.equal(clientA._bestLocalIP, pB.remoteAddress, 'clientA recorded pBs remoteAddress')
  t.ok(clientB._bestLocalIP, 'bestLocalIP set on clientB after WebRTC')
  t.equal(clientB._bestLocalIP, pA.remoteAddress, 'clientB recorded pAs remoteAddress')

  await Promise.all([
    new Promise(resolve => clientA.destroy(resolve)),
    new Promise(resolve => clientB.destroy(resolve))
  ])
  t.pass('clients destroyed')
})

test('NAT traversal externalIp recorded via _recordIP on listening', async t => {
  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })
  client.on('error', err => { t.fail(err) })

  await new Promise(resolve => client.on('listening', resolve))

  client.natTraversal = {
    externalIp: () => Promise.resolve('203.0.113.5'),
    map: () => Promise.resolve(),
    destroy: () => Promise.resolve()
  }

  client._onListening()

  await new Promise(resolve => setImmediate(resolve))

  t.equal(client._bestLocalIP, '203.0.113.5', 'external IP recorded via _recordIP')

  await new Promise(resolve => client.destroy(resolve))
  t.pass('client destroyed')
})
