import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import test from 'tape'
import WebTorrent from '../../index.js'

function setupClient ({ t, onTorrent, onIdle, addTorrentProps = {} }) {
  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })
  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false })
  client2.on('error', function (err) { t.fail(err) })
  client2.on('warning', function (err) { t.fail(err) })

  const parsedTorrent = Object.assign({}, fixtures.leaves.parsedTorrent)

  client1.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: [],
    store: MemoryChunkStore
  }, () => {
    client2.add(parsedTorrent, { store: MemoryChunkStore, ...addTorrentProps }, (torrent) => {
      onTorrent(torrent)

      torrent.addPeer(`localhost:${client1.torrentPort}`)

      torrent.once('idle', () => {
        onIdle(torrent)

        Promise.all([
          new Promise((resolve) => client1.destroy(function (err) { t.error(err, 'client1 destroyed'); resolve() })),
          new Promise((resolve) => client2.destroy(function (err) { t.error(err, 'client2 destroyed'); resolve() }))
        ]).then(() => t.end())
      })
    })
  })
}

test('client.select: whole torrent', function (t) {
  setupClient({
    t,
    onTorrent: (torrent) => {
      torrent.select(0, torrent.pieces.length - 1)
    },
    onIdle: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, torrent.pieces.length)
    }
  })
})

test('client.select: partial torrent', function (t) {
  let lastPieceIndex
  setupClient({
    t,
    onTorrent: (torrent) => {
      lastPieceIndex = Math.floor((torrent.pieces.length - 1) / 2)
      torrent.deselect(0, torrent.pieces.length - 1)
      torrent.select(0, lastPieceIndex)
    },
    onIdle: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, (lastPieceIndex + 1))
    }
  })
})

test('client.deselect: whole torrent', function (t) {
  setupClient({
    t,
    onTorrent: (torrent) => {
      torrent.deselect(0, torrent.pieces.length - 1)
    },
    onIdle: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, 0)
    }
  })
})

test('client.deselect: whole torrent - start as deselected', function (t) {
  setupClient({
    t,
    onTorrent: () => {},
    addTorrentProps: { deselect: true },
    onIdle: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, 0)
    }
  })
})

test('client.deselect: partial torrent - second half deselected', function (t) {
  let lastPieceIndex
  setupClient({
    t,
    onTorrent: (torrent) => {
      lastPieceIndex = Math.floor((torrent.pieces.length - 1) / 2)
      torrent.deselect(0, lastPieceIndex)
    },
    onIdle: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, (torrent.pieces.length - 1 - lastPieceIndex))
      // this test used to check the remaining selections, but now checking on idle removes the selections, so they don't exist
      // assertSelectionsEquals(t, torrent._selections, [[lastPieceIndex + 1, torrent.pieces.length - 1]])
    }
  })
})

test('client.deselect: partial torrent - second half deselected', function (t) {
  let lastPieceIndex
  setupClient({
    t,
    onTorrent: (torrent) => {
      lastPieceIndex = Math.floor((torrent.pieces.length - 1) / 2)
      torrent.deselect(lastPieceIndex, torrent.pieces.length - 1)
    },
    onIdle: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, (torrent.pieces.length - 1 - lastPieceIndex))
      // this test used to check the remaining selections, but now checking on idle removes the selections, so they don't exist
      // assertSelectionsEquals(t, torrent._selections, [[0, lastPieceIndex - 1]])
    }
  })
})

test('client.deselect: multiple overlapping ranges', function (t) {
  setupClient({
    t,
    addTorrentProps: { deselect: true },
    onTorrent: (/** @type {import('../../lib/torrent.js').default} */torrent) => {
      torrent.select(3, 10)
      torrent.select(5, 12)
      torrent.select(12, 18)
      torrent.select(15, 22)
      torrent.select(0, 4)
      t.assert(torrent._selections.length === 4)
      assertSelectionsEquals(t, torrent._selections, [[0, 4], [5, 11], [12, 14], [15, 22]])

      torrent.deselect(4, 8)
      torrent.deselect(14, 17)
      torrent.deselect(20, 21)
      t.assert(torrent._selections.length === 5)
      assertSelectionsEquals(t, torrent._selections, [[0, 3], [9, 11], [12, 13], [18, 19], [22, 22]])
    },
    onIdle: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, 12)
    }
  })
})

/**
 * @param {import('tape').Test} t
 * @param {import('../../lib/selections.js').Selections} selections
 * @param {[number,number][]} expected
 */
function assertSelectionsEquals (t, selections, expected) {
  t.equal(selections.length, expected.length)
  const selectionItems = [...selections._items]
  selectionItems.sort((a, b) => a.from - b.from)
  expected.sort((a, b) => a[0] - b[0])

  for (let i = 0; i < expected.length; i++) {
    const actualRange = [selectionItems[i].from, selectionItems[i].to]
    const expectedRange = expected[i]
    t.deepEqual(actualRange, expectedRange)
  }
}
