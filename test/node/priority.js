import { PassThrough } from 'stream'
import test from 'tape'
import fixtures from 'webtorrent-fixtures'
import Peer from '../../lib/peer.js'
import WebTorrent from '../../index.js'

test('torrent.setPriority updates priority', t => {
  const client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', err => { t.fail(err) })

  const torrent = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000001', { store: false })

  t.equal(torrent.priority, 1, 'default priority is 1')
  torrent.setPriority(5)
  t.equal(torrent.priority, 5, 'priority updated')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('_fairShare computed dynamically from priority', t => {
  const client = new WebTorrent({ dht: false, tracker: false, connectionBudget: 100 })
  client.on('error', err => { t.fail(err) })

  const a = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000001', { store: false })
  const b = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000002', { store: false })

  t.equal(a._fairShare, 50, 'equal priority equal fair share')
  t.equal(b._fairShare, 50, 'equal priority equal fair share')

  a.setPriority(3)
  t.equal(a._fairShare, 90, 'p3^2=9 gets 9/10 of budget=90')
  t.equal(b._fairShare, 10, 'p1^2=1 gets 1/10 of budget=10')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('priority set via client.add opts', t => {
  const client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', err => { t.fail(err) })

  const torrent = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000001', { store: false, priority: 3 })
  t.equal(torrent.priority, 3, 'priority set via opts')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('_totalPeers and _totalPending sum across active torrents', t => {
  const client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', err => { t.fail(err) })

  t.equal(client._totalConns, 0, 'sums to 0 with no torrents')
  t.equal(client._totalPending, 0, 'sums to 0 with no torrents')

  const a = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000001', { store: false })
  t.equal(client._totalConns, 0, 'sums to 0 with no peers')
  t.equal(client._totalPending, 0, 'sums to 0 with no pending')

  const b = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000002', { store: false })
  a._numConns = 5
  b._numConns = 3
  a._numPending = 2
  t.equal(client._totalConns, 8, 'sums _numConns across torrents')
  t.equal(client._totalPending, 2, 'sums _numPending across torrents')

  a.destroy()
  t.equal(client._totalConns, 3, 'skips destroyed torrents')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('_fairShare scales linearly with priority regardless of torrent count', t => {
  const client = new WebTorrent({ dht: false, tracker: false, connectionBudget: 100 })
  client.on('error', err => { t.fail(err) })

  const high = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000001', { store: false, priority: 3 })

  t.equal(high._fairShare, 100, 'p3 alone gets 100 = floor(100*3/3)')

  for (let i = 0; i < 50; i++) {
    client.add('magnet:?xt=urn:btih:' + String(i).padStart(40, '0'), { store: false, priority: 1 })
  }

  t.equal(high._fairShare, 16, 'p3 gets ceil(100*9/59)=16 with 50 p1s')
  t.ok(high._fairShare >= 16, 'p3 share stays above 16 under p1 flood')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('setPriority triggers _drain', t => {
  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })
  client.on('error', err => { t.fail(err) })

  client.on('listening', () => {
    const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent.on('infoHash', () => {
      const peer = Peer.createTCPOutgoingPeer('127.0.0.1:8001', torrent, client.throttleGroups, 'manual', client.secure)
      torrent._registerPeer(peer)
      torrent._queue.push(peer)

      t.equal(torrent._queue.length, 1, 'peer queued')

      torrent.setPriority(3)

      t.equal(torrent._queue.length, 0, '_drain popped peer after setPriority')

      client.destroy(() => t.end())
    })
  })
})

test('_findLowestPriorityPeer returns peer below threshold', t => {
  const client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', err => { t.fail(err) })

  const torrent = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000001', { store: false })

  const p1 = { bep40Priority: 100, destroy () {} }
  const p2 = { bep40Priority: 50, destroy () {} }
  const p3 = { bep40Priority: 10, destroy () {} }
  const p4 = { bep40Priority: 200, destroy () {} }

  torrent._peers.set('a', p1)
  torrent._peers.set('b', p2)
  torrent._peers.set('c', p3)
  torrent._peers.set('d', p4)

  t.equal(torrent._findLowestPriorityPeer(60), p3, 'finds lowest priority (10) below threshold')
  t.equal(torrent._findLowestPriorityPeer(15), p3, 'finds priority 10 below threshold 15')
  t.equal(torrent._findLowestPriorityPeer(5), null, 'no peer below threshold 5')
  t.equal(torrent._findLowestPriorityPeer(300), p3, 'finds lowest across all when threshold is high')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('_addIncomingPeer evicts lowest priority peer at max connections', t => {
  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, connectionBudget: 9999 })
  client.on('error', err => { t.fail(err) })

  client.on('listening', () => {
    const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent.on('infoHash', () => {
      const existing = new Peer('0.0.0.0:8001', Peer.TYPE_TCP_INCOMING, 0)
      existing.bep40Priority = 10
      existing.swarm = torrent
      torrent._peers.set(existing.id, existing)
      torrent._numConns = client.maxConns

      const incoming = new Peer('10.0.0.1:9999', Peer.TYPE_TCP_INCOMING, 0)
      incoming.bep40Priority = 9999
      incoming.connected = true
      incoming.swarm = torrent

      torrent._addIncomingPeer(incoming)

      t.ok(existing.destroyed, 'existing low-priority peer destroyed')
      t.ok(torrent._peers.has(incoming.id), 'incoming peer registered')

      client.destroy(() => t.end())
    })
  })
})

test('_addIncomingPeer rejects when no lower priority peer to evict', t => {
  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, connectionBudget: 9999 })
  client.on('error', err => { t.fail(err) })

  client.on('listening', () => {
    const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent.on('infoHash', () => {
      const existing = new Peer('0.0.0.0:8001', Peer.TYPE_TCP_INCOMING, 0)
      existing.bep40Priority = 100
      existing.swarm = torrent
      torrent._peers.set(existing.id, existing)
      torrent._numConns = client.maxConns

      const incoming = new Peer('10.0.0.1:9999', Peer.TYPE_TCP_INCOMING, 0)
      incoming.bep40Priority = 50
      incoming.connected = true
      incoming.swarm = torrent

      torrent._addIncomingPeer(incoming)

      t.ok(incoming.destroyed, 'incoming peer destroyed when no lower priority to evict')

      client.destroy(() => t.end())
    })
  })
})

test('_addIncomingPeer rejects zero-bep40Priority peer at max connections', t => {
  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, connectionBudget: 9999 })
  client.on('error', err => { t.fail(err) })

  client.on('listening', () => {
    const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent.on('infoHash', () => {
      const existing = new Peer('0.0.0.0:8001', Peer.TYPE_TCP_INCOMING, 0)
      existing.swarm = torrent
      torrent._peers.set(existing.id, existing)
      torrent._numConns = client.maxConns

      const incoming = new Peer('10.0.0.1:9999', Peer.TYPE_TCP_INCOMING, 0)
      incoming.bep40Priority = 0
      incoming.connected = true
      incoming.swarm = torrent

      torrent._addIncomingPeer(incoming)

      t.ok(incoming.destroyed, 'zero-priority incoming peer rejected')

      client.destroy(() => t.end())
    })
  })
})

test('_queue sorted by bep40Priority descending after addPeer', t => {
  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })
  client.on('error', err => { t.fail(err) })

  client._recordIP('127.0.0.1')

  client.on('listening', () => {
    const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent.on('infoHash', () => {
      torrent._numConns = client.maxConns

      torrent.addPeer('127.0.0.1:8001')
      torrent.addPeer('127.0.0.1:8002')
      torrent.addPeer('127.0.0.1:8003')

      t.equal(torrent._queue.length, 3, '3 peers in queue')
      const priorities = torrent._queue.map(p => p.bep40Priority)
      for (let i = 1; i < priorities.length; i++) {
        t.ok(priorities[i - 1] >= priorities[i], `queue sorted descending at index ${i}`)
      }

      client.destroy(() => t.end())
    })
  })
})

test('_drain respects budget gating when at fair share', t => {
  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, connectionBudget: 6 })
  client.on('error', err => { t.fail(err) })

  client.on('listening', () => {
    const torrent = client.add(fixtures.leaves.parsedTorrent.infoHash)

    torrent.on('infoHash', () => {
      torrent._numConns = 6

      const peer = Peer.createTCPOutgoingPeer('127.0.0.1:8001', torrent, client.throttleGroups, 'manual', client.secure)
      torrent._registerPeer(peer)
      torrent._queue.push(peer)

      t.equal(torrent._queue.length, 1, 'peer queued')

      torrent._drain()

      t.equal(torrent._queue.length, 1, 'peer remained in queue after drain bailed')

      client.destroy(() => t.end())
    })
  })
})

test('_fairShare proportional across multiple priority levels', t => {
  const client = new WebTorrent({ dht: false, tracker: false, connectionBudget: 60 })
  client.on('error', err => { t.fail(err) })

  const high = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000001', { store: false, priority: 3 })
  const mid = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000002', { store: false, priority: 2 })
  const low = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000003', { store: false, priority: 1 })

  t.equal(high._fairShare, 39, 'p3^2=9 gets ceil(60*9/14)=39')
  t.equal(mid._fairShare, 18, 'p2^2=4 gets ceil(60*4/14)=18')
  t.equal(low._fairShare, 5, 'p1^2=1 gets ceil(60*1/14)=5')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('_fairShare rounds up even with tiny budget', t => {
  const client = new WebTorrent({ dht: false, tracker: false, connectionBudget: 1 })
  client.on('error', err => { t.fail(err) })

  const a = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000001', { store: false, priority: 1 })
  const b = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000002', { store: false, priority: 2 })

  t.equal(a._fairShare, 1, 'p1^2=1 ceil(1*1/5)=1')
  t.equal(b._fairShare, 1, 'p2^2=4 ceil(1*4/5)=1')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('_fairShare returns 0 when torrent destroyed', t => {
  const client = new WebTorrent({ dht: false, tracker: false })
  client.on('error', err => { t.fail(err) })

  const torrent = client.add('magnet:?xt=urn:btih:0000000000000000000000000000000000000001', { store: false })
  torrent.destroy()
  t.equal(torrent._fairShare, 0, 'destroyed torrent returns 0')

  client.destroy(err => {
    t.error(err, 'client destroyed')
    t.end()
  })
})

test('WebSeed peer bep40Priority is Infinity', t => {
  const conn = new PassThrough()
  conn.remoteAddress = '127.0.0.1'
  conn.remotePort = 9999

  const throttleGroups = { down: { throttle: () => new PassThrough() }, up: { throttle: () => new PassThrough() } }
  const peer = Peer.createWebSeedPeer(conn, 'http://example.com/test', null, throttleGroups)

  t.equal(peer.bep40Priority, Infinity, 'web seed peer has Infinity priority')
  peer.wire?.on('error', () => {})
  peer.destroy()

  t.end()
})
