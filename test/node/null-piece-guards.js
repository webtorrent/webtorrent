import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import test from 'tape'
import WebTorrent from '../../index.js'

// A piece is nulled when it verifies, but `bitfield` is set from an async store
// callback, so there is a window in which `pieces[index]` is null and
// `bitfield.get(index)` is still false. Everything that reads a piece without
// checking throws in that window. `deselect` widens the window enormously,
// which is why streaming clients see it constantly.
function withTorrent (t, run) {
  const client = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })
  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  client.add(Object.assign({}, fixtures.leaves.parsedTorrent), { store: MemoryChunkStore }, torrent => {
    torrent.on('ready', () => {})
    run(torrent, () => client.destroy(() => t.end()))
  })
}

test('downloaded getter survives a piece nulled before its bitfield is set', t => {
  t.plan(2)

  withTorrent(t, (torrent, done) => {
    t.equal(torrent.bitfield.get(0), false, 'the piece has not been verified yet')
    torrent.pieces[0] = null

    t.doesNotThrow(() => torrent.downloaded, 'reading downloaded does not throw')
    done()
  })
})

test('_request does not throw when the piece is gone', t => {
  t.plan(1)

  withTorrent(t, (torrent, done) => {
    torrent.pieces[0] = null

    const wire = {
      type: 'tcp',
      requests: [],
      peerPieces: { get: () => true },
      downloadSpeed: () => 0
    }

    t.equal(torrent._request(wire, 0, false), false, 'nothing is requested from a piece that is gone')
    done()
  })
})
