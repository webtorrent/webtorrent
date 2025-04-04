import fixtures from 'webtorrent-fixtures'
import test from 'tape'
import WebTorrent from '../index.js'

test('preloaded bitfield: load files into filesystem', t => {
  t.plan(2)

  const client = new WebTorrent({ dht: false, utp: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  // Start seeding
  client.seed(fixtures.leaves.content, {
    name: 'Leaves of Grass by Walt Whitman.epub',
    announce: []
  }, () => {
    t.ok('loaded files into filesystem')
    client.destroy(err => { t.error(err, 'client 2 destroyed') })
  })
})

test('preloaded bitfield: full bitfield, files exist', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, utp: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.torrent, { bitfield: new Uint8Array([255, 255, 254]) })
  // torrent has only one file, so only one piece should be verified, checks if file exists.
  torrent.on('verified', i => t.equal(i, 1, 'verified only piece'))

  torrent.on('ready', () => {
    t.ok(torrent._hasStartupBitfield, 'has startup bitfield')
    client.destroy(err => t.error(err, 'client destroyed'))
  })
})

test('preloaded bitfield: partial bitfield, files exist', t => {
  t.plan(4)

  const client = new WebTorrent({ dht: false, utp: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.torrent, { bitfield: new Uint8Array([0, 0, 255]) })
  // torrent has only one file, so only one piece should be verified, checks if file exists, fails, unmarks entire file
  torrent.on('verified', i => t.equal(i, 17, 'verified only piece'))

  torrent.on('ready', () => {
    t.ok(torrent._hasStartupBitfield, 'has startup bitfield')
    t.ok(!torrent.done, 'torrent not done')
    client.destroy(err => t.error(err, 'client destroyed'))
  })
})

test('preloaded bitfield: wrong size bitfield, files exist', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, utp: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.torrent, { bitfield: new Uint8Array([255, 255]) })
  // partial bitfield will fail because there's only one file, so it will re-scan all pieces once
  let verifiedPieces = 0
  torrent.on('verified', () => ++verifiedPieces)

  torrent.on('ready', () => {
    t.equal(verifiedPieces, torrent.pieces.length, 'verified only piece')
    t.ok(!torrent._hasStartupBitfield, 'startup bitfield ignored because of miss-match')
    torrent.destroy({ destroyStore: true }, () => {
      client.destroy(err => t.error(err, 'client destroyed'))
    })
  })
})

test('preloaded bitfield: full bitfield, files don\'t exist', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, utp: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.torrent, { bitfield: new Uint8Array([255, 255, 254]) })
  // torrent has only one file, so only one piece should be verified, checks if file exists, then fails and rescans all pieces
  let verifiedPieces = 0
  torrent.on('verified', () => ++verifiedPieces)

  torrent.on('ready', () => {
    t.equal(verifiedPieces, 0, 'no pieces successfully verified')
    t.ok(torrent._hasStartupBitfield, 'has startup bitfield')
    client.destroy(err => t.error(err, 'client destroyed'))
  })
})

test('preloaded bitfield: wrong size bitfield, files don\'t exist', t => {
  t.plan(3)

  const client = new WebTorrent({ dht: false, utp: false, tracker: false, lsd: false, natUpnp: false, natPmp: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  const torrent = client.add(fixtures.leaves.torrent, { bitfield: new Uint8Array([255, 255]) })
  // partial bitfield will fail because there's only one file, so it will re-scan all pieces once
  let verifiedPieces = 0
  torrent.on('verified', () => ++verifiedPieces)

  torrent.on('ready', () => {
    t.equal(verifiedPieces, 0, 'no pieces successfully verified')
    t.ok(!torrent._hasStartupBitfield, 'startup bitfield ignored because of miss-match')
    client.destroy(err => t.error(err, 'client destroyed'))
  })
})
