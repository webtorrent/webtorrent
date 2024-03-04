import fixtures from 'webtorrent-fixtures'
import MemoryChunkStore from 'memory-chunk-store'
import test from 'tape'
import WebTorrent from '../../index.js'

function setupClient ({ t, onTorrent, onDone, addTorrentProps = {} }) {
  const client1 = new WebTorrent({ dht: false, tracker: false, lsd: false })
  client1.on('error', function (err) { t.fail(err) })
  client1.on('warning', function (err) { t.fail(err) })

  const client2 = new WebTorrent({ dht: false, tracker: false, lsd: false })
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

      torrent.once('done', () => {
        onDone(torrent)

        client1.destroy(function (err) { t.error(err, 'client1 destroyed') })
        client2.destroy(function (err) { t.error(err, 'client2 destroyed') })
      })
    })
  })
}

test('client.select: whole torrent', function (t) {
  t.plan(3)

  setupClient({
    t,
    onTorrent: (torrent) => {
      torrent.select(0, torrent.pieces.length - 1)
    },
    onDone: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, torrent.pieces.length)
    }
  })
})

test('client.select: partial torrent', function (t) {
  t.plan(3)

  let lastPiece
  setupClient({
    t,
    onTorrent: (torrent) => {
      lastPiece = Math.floor((torrent.pieces.length - 1) / 2)
      torrent.deselect(0, torrent.pieces.length - 1)
      torrent.select(0, lastPiece)
    },
    onDone: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, (lastPiece + 1))
    }
  })
})

test('client.deselect: whole torrent', function (t) {
  t.plan(3)

  setupClient({
    t,
    onTorrent: (torrent) => {
      torrent.deselect(0, torrent.pieces.length - 1)
    },
    onDone: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, 0)
    }
  })
})

test('client.deselect: whole torrent - start as deselected', function (t) {
  t.plan(3)

  setupClient({
    t,
    onTorrent: () => {},
    addTorrentProps: { deselect: true },
    onDone: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, 0)
    }
  })
})

test('client.deselect: partial torrent', function (t) {
  t.plan(3)

  let lastPiece
  setupClient({
    t,
    onTorrent: (torrent) => {
      lastPiece = Math.floor((torrent.pieces.length - 1) / 2)
      torrent.deselect(0, lastPiece)
    },
    onDone: (torrent) => {
      t.equal(torrent.pieces.filter((a) => a === null).length, (torrent.pieces.length - 1 - lastPiece))
    }
  })
})
