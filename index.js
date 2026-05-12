/*! webtorrent. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */
import EventEmitter from 'events'
import path from 'path'
import createTorrent, { parseInput } from 'create-torrent'
import debugFactory from 'debug'
import { Client as DHT } from 'bittorrent-dht' // browser exclude
import loadIPSet from 'load-ip-set' // browser exclude
import parallel from 'run-parallel'
import parseTorrent from 'parse-torrent'
import Peer from '@thaunknown/simple-peer/lite.js'
import queueMicrotask from 'queue-microtask'
import { hash, hex2arr, arr2hex, arr2base, text2arr, randomBytes, concat } from 'uint8-util'
import throughput from 'throughput'
import { ThrottleGroup } from 'speed-limiter'
import NatAPI from '@silentbot1/nat-api' // browser exclude
import ConnPool from './lib/conn-pool.js' // browser exclude
import Torrent from './lib/torrent.js'
import { NodeServer, BrowserServer } from './lib/server.js'

import VERSION from './version.cjs'

const debug = debugFactory('webtorrent')

// Extend WebTorrent class to include enhanced DHT functionality.
export default class WebTorrent extends EventEmitter {
  constructor(opts = {}) {
    super()

    // Configure DHT client
    if (opts.dht !== false && typeof DHT === 'function') {
      this.dht = new DHT({
        nodeId: opts.nodeId || randomBytes(20),
        bootstrap: opts.dhtBootstrap || true,
      })
      this.dht.listen(opts.dhtPort || 20000, () => {
        console.log(`DHT listening on port ${this.dht.address().port}`)
      })

      this.dht.on('peer', (peer, infoHash) => {
        console.log(`Found peer: ${peer.host}:${peer.port} for infoHash: ${infoHash}`)
      })
    } else {
      this.dht = null
    }
    
    // Existing properties
    this.torrents = []
    this.destroyed = false
  }

  addTorrent(torrentId, opts = {}) {
    const torrent = new Torrent(torrentId, this, opts)

    if (this.dht) {
      // Announce torrent's infoHash to the DHT
      this.dht.announce(torrent.infoHash, opts.torrentPort || 6881, () => {
        console.log(`Announced torrent (${torrent.infoHash}) to DHT.`)
      })
    }

    torrent.once('ready', () => {
      console.log(`Torrent ready: ${torrent.infoHash}`)
    })

    torrent.once('error', (err) => {
      console.error(`Error with torrent ${torrent.infoHash}: ${err.message}`)
    })

    this.torrents.push(torrent)
    return torrent
  }

  destroy(cb) {
    if (this.destroyed) return
    this.destroyed = true

    // Clear DHT
    if (this.dht) {
      this.dht.destroy(() => {
        console.log('DHT instance destroyed')
      })
    }

    // Destroy all torrents
    const tasks = this.torrents.map((torrent) => (done) => torrent.destroy(done))
    parallel(tasks, cb)
  }
}