import fs from 'fs'
import os from 'os'
import path from 'path'
import MemoryChunkStore from 'memory-chunk-store'
import test from 'tape'
import WebTorrent from '../../index.js'

const clientOpts = { dht: false, tracker: false, lsd: false, natUpnp: false, natPmp: false }

function createClient (t) {
  const client = new WebTorrent(clientOpts)
  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })
  return client
}

function createFiles (directory, files) {
  return files.map(file => {
    const filePath = path.join(directory, file)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, file)
    return filePath
  })
}

test('client.seed: array of filesystem paths uses common parent name', t => {
  t.plan(3)

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'webtorrent-seed-array-'))
  const input = createFiles(directory, ['index.html', 'package.json'])
  const client = createClient(t)

  client.seed(input, { announce: [], store: MemoryChunkStore }, torrent => {
    const name = path.basename(directory)
    t.equal(torrent.name, name)
    t.deepEqual(torrent.files.map(file => file.path).sort(), [
      path.join(name, 'index.html'),
      path.join(name, 'package.json')
    ])

    client.destroy(err => {
      t.error(err, 'client destroyed')
      fs.rmSync(directory, { recursive: true, force: true })
    })
  })
})

test('client.seed: array of filesystem paths preserves explicit name', t => {
  t.plan(2)

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'webtorrent-seed-array-'))
  const input = createFiles(directory, ['one.txt', 'two.txt'])
  const client = createClient(t)

  client.seed(input, { announce: [], name: 'custom-name', store: MemoryChunkStore }, torrent => {
    t.equal(torrent.name, 'custom-name')

    client.destroy(err => {
      t.error(err, 'client destroyed')
      fs.rmSync(directory, { recursive: true, force: true })
    })
  })
})

test('client.seed: single filesystem path keeps file name and store path', t => {
  t.plan(4)

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'webtorrent-seed-array-'))
  const [input] = createFiles(directory, ['single.txt'])
  const client = createClient(t)

  client.seed(input, { announce: [] }, torrent => {
    t.equal(torrent.name, 'single.txt')
    t.equal(torrent.files[0].path, 'single.txt')
    t.equal(torrent.path, directory)

    client.destroy(err => {
      t.error(err, 'client destroyed')
      fs.rmSync(directory, { recursive: true, force: true })
    })
  })
})

test('client.seed: array of filesystem paths uses deepest common ancestor name', t => {
  t.plan(2)

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'webtorrent-seed-array-'))
  const input = createFiles(directory, ['first/one.txt', 'second/two.txt'])
  const client = createClient(t)

  client.seed(input, { announce: [], store: MemoryChunkStore }, torrent => {
    t.equal(torrent.name, path.basename(directory))

    client.destroy(err => {
      t.error(err, 'client destroyed')
      fs.rmSync(directory, { recursive: true, force: true })
    })
  })
})

test('client.seed: array of filesystem paths at root keeps create-torrent fallback', t => {
  t.plan(2)

  const packagePath = path.resolve('package.json')
  const hostsPath = process.platform === 'win32'
    ? path.join(process.env.SystemRoot, 'System32', 'drivers', 'etc', 'hosts')
    : '/etc/hosts'
  const client = createClient(t)

  client.seed([packagePath, hostsPath], { announce: [], store: MemoryChunkStore }, torrent => {
    t.equal(torrent.name, path.basename(packagePath))
    client.destroy(err => { t.error(err, 'client destroyed') })
  })
})
