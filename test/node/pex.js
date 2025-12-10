import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../../index.js'

test('PeX: ut_pex.start() is called on new wires', t => {
  t.plan(3)

  const client = new WebTorrent({ 
    dht: false, 
    tracker: false, 
    lsd: false, 
    natUpnp: false, 
    natPmp: false,
    utPex: true
  })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent, { store: 'memory' })

  torrent.on('wire', wire => {
    if (wire.ut_pex) {
      t.ok(wire.ut_pex._intervalId !== null, 'PeX timer should be started')
      t.ok(typeof wire.ut_pex.addPeer === 'function', 'PeX should have addPeer method')
      
      client.destroy(err => {
        t.error(err, 'client destroyed')
      })
    }
  })

  torrent.addPeer('127.0.0.1:8080')
})

test('PeX: existing peers are shared with new wires', t => {
  t.plan(4)

  const client1 = new WebTorrent({ 
    dht: false, 
    tracker: false, 
    lsd: false, 
    natUpnp: false, 
    natPmp: false,
    utPex: true
  })
  const client2 = new WebTorrent({ 
    dht: false, 
    tracker: false, 
    lsd: false, 
    natUpnp: false, 
    natPmp: false,
    utPex: true
  })

  client1.on('error', err => { t.fail(err) })
  client1.on('warning', err => { t.fail(err) })
  client2.on('error', err => { t.fail(err) })
  client2.on('warning', err => { t.fail(err) })

  const torrent1 = client1.add(fixtures.leaves.parsedTorrent, { store: 'memory' })
  const torrent2 = client2.add(fixtures.leaves.parsedTorrent, { store: 'memory' })

  let wire1, wire2
  let connectCount = 0

  const onWire = () => {
    connectCount++
    if (connectCount === 2) {
      t.ok(wire1.ut_pex, 'First wire has PeX')
      t.ok(wire2.ut_pex, 'Second wire has PeX')
      
      const wire3 = torrent1.addPeer('127.0.0.1:8081')
      
      torrent1.once('wire', newWire => {
        if (newWire === wire3 && newWire.ut_pex) {
          setTimeout(() => {
            t.ok(newWire.ut_pex._intervalId !== null, 'New wire PeX should be started')
            t.pass('PeX peer sharing setup completed')
            
            client1.destroy()
            client2.destroy()
          }, 100)
        }
      })
    }
  }

  torrent1.on('wire', wire => {
    wire1 = wire
    onWire()
  })

  torrent2.on('wire', wire => {
    wire2 = wire
    onWire()
  })

  torrent1.addPeer('127.0.0.1:8080')
  torrent2.addPeer('127.0.0.1:8080')
})

test('PeX: wire close resets ut_pex', t => {
  t.plan(2)

  const client = new WebTorrent({ 
    dht: false, 
    tracker: false, 
    lsd: false, 
    natUpnp: false, 
    natPmp: false,
    utPex: true
  })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.parsedTorrent, { store: 'memory' })

  torrent.on('wire', wire => {
    if (wire.ut_pex) {
      const intervalId = wire.ut_pex._intervalId
      t.ok(intervalId !== null, 'PeX timer should be active')
      
      wire.destroy()
      
      setTimeout(() => {
        t.ok(wire.ut_pex._intervalId === null, 'PeX timer should be reset after wire close')
        client.destroy()
      }, 50)
    }
  })

  torrent.addPeer('127.0.0.1:8080')
})