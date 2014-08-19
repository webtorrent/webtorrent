# ![WebTorrent](https://raw.github.com/feross/webtorrent/master/img/wordmark.png)
[![build](https://img.shields.io/travis/feross/webtorrent.svg)](https://travis-ci.org/feross/webtorrent)
[![npm](https://img.shields.io/npm/v/webtorrent.svg)](https://npmjs.org/package/webtorrent)
[![gittip](https://img.shields.io/gittip/feross.svg)](https://www.gittip.com/feross/)

### WebTorrent - Streaming torrent client for node and the browser

> Warning: This is pre-alpha software. Nothing works yet. **Watch/star to follow along with progress.**

### Ways to help

- **Fix bugs, add features.** Join `#webtorrent` on Freenode. Take a look at the [open issues](https://github.com/feross/webtorrent/issues?state=open) on this repo **[and the others](#npm-modules)** see what you can help with.
- **Donations.** If you believe in the vision, send bitcoin to *1B6aystcqu8fd6ejzpmMFMPRqH9b86iiwh* or [donate via Coinbase](https://coinbase.com/checkouts/7c683397e33166651dedfebee6fb0f96).

### Report Issues

- **[Report New Issue](https://github.com/feross/webtorrent-issues/issues/new)**
- **[View Open Issues](https://github.com/feross/webtorrent-issues/issues?q=is%3Aopen+is%3Aissue)**

There is a single repo ([webtorrent-issues](https://github.com/feross/webtorrent-issues))
for managing publicly recognized issues with the webtorrent client, tracker, and website.

### Planned Features

- **BitTorrent in your browser!**
- **No plugins** (uses WebRTC Data Channels for peer-to-peer data)
- **Streaming playback** (get first pieces first)
  - Into `video` tag with MediaSource API when possible
  - Flash player with JS bridge for other media types
- Works with .torrent files and magnet links
- Supports DHT (trackerless torrents) over WebRTC
  - Extensions to DHT protocol to work over WebRTC
  - DHT nodes do "peer introductions" so WebRTC can work without a centralized signaling server
- **Supports completely serverless, trackerless operation**

### Project Goal

Build a browser BitTorrent client that requires no install (no plugin/extension/etc.) and fully-interoperates with the regular BitTorrent network. Use WebRTC Data Channels for peer-to-peer transport.

Since WebTorrent is web-first, it's simple for users who do not understand .torrent files, magnet links, NATs, etc. By making BitTorrent easier, it will be accessible to new swathes of users who were previously intimidated, confused, or unwilling to install a program on their machine to participate.

### NPM Modules

Most of the active development is happening inside of smaller npm modules which will be used by WebTorrent. These are the modules I am writing to make WebTorrent work:

#### Modules:

| module | tests | version | description |
|---|---|---|---|
| [bittorrent-client](https://github.com/feross/bittorrent-client) | [![](https://img.shields.io/travis/feross/webtorrent.svg)](https://travis-ci.org/feross/webtorrent) | [![](https://img.shields.io/npm/v/webtorrent.svg)](https://npmjs.org/package/webtorrent) | streaming torrent engine
| [bittorrent-dht](https://github.com/feross/bittorrent-dht) | [![](https://img.shields.io/travis/feross/bittorrent-dht.svg)](https://travis-ci.org/feross/bittorrent-dht) | [![](https://img.shields.io/npm/v/bittorrent-dht.svg)](https://npmjs.org/package/bittorrent-dht) | dht client
| [bittorrent-discovery](https://github.com/feross/bittorrent-discovery) | [![](https://img.shields.io/travis/feross/bittorrent-discovery.svg)](https://travis-ci.org/feross/bittorrent-discovery) | [![](https://img.shields.io/npm/v/bittorrent-discovery.svg)](https://npmjs.org/package/bittorrent-discovery) | find peers via dht and tracker
| [bittorrent-peerid](https://github.com/fisch0920/bittorrent-peerid) | [![](https://img.shields.io/travis/fisch0920/bittorrent-peerid.svg)](https://travis-ci.org/fisch0920/bittorrent-peerid) | [![](https://img.shields.io/npm/v/bittorrent-peerid.svg)](https://npmjs.org/package/bittorrent-peerid) | identify client name/version
| [bittorrent-protocol](https://github.com/feross/bittorrent-protocol) | [![](https://img.shields.io/travis/feross/bittorrent-protocol.svg)](https://travis-ci.org/feross/bittorrent-protocol) | [![](https://img.shields.io/npm/v/bittorrent-protocol.svg)](https://npmjs.org/package/bittorrent-protocol) | protocol stream
| extension: [ut_metadata](https://github.com/feross/ut_metadata) | [![](https://img.shields.io/travis/feross/ut_metadata.svg)](https://travis-ci.org/feross/ut_metadata) | [![](https://img.shields.io/npm/v/ut_metadata.svg)](https://npmjs.org/package/ut_metadata) | fetch metadata for magnet uris
| extension: [ut_pex](https://github.com/fisch0920/ut_pex) | [![](https://img.shields.io/travis/feross/ut_metadata.svg)](https://travis-ci.org/feross/ut_metadata) | [![](https://img.shields.io/npm/v/ut_metadata.svg)](https://npmjs.org/package/ut_metadata) | peer discovery protocol
| [bittorrent-swarm](https://github.com/feross/bittorrent-swarm) | [![](https://img.shields.io/travis/feross/bittorrent-swarm.svg)](https://travis-ci.org/feross/bittorrent-swarm) | [![](https://img.shields.io/npm/v/bittorrent-swarm.svg)](https://npmjs.org/package/bittorrent-swarm) | connection manager
| [bittorrent-tracker](https://github.com/feross/bittorrent-tracker) | [![](https://img.shields.io/travis/feross/bittorrent-tracker.svg)](https://travis-ci.org/feross/bittorrent-tracker) | [![](https://img.shields.io/npm/v/bittorrent-tracker.svg)](https://npmjs.org/package/bittorrent-tracker) | tracker server/client
| [buffer](https://github.com/feross/buffer) | [![](https://img.shields.io/travis/feross/buffer.svg)](https://travis-ci.org/feross/buffer) | [![](https://img.shields.io/npm/v/buffer.svg)](https://npmjs.org/package/buffer) | node buffer api for the browser
| [create-torrent](https://github.com/feross/create-torrent) | [![](https://img.shields.io/travis/feross/create-torrent.svg)](https://travis-ci.org/feross/create-torrent) | [![](https://img.shields.io/npm/v/create-torrent.svg)](https://npmjs.org/package/create-torrent) | create .torrent files
| [magnet-uri](https://github.com/feross/magnet-uri) | [![](https://img.shields.io/travis/feross/magnet-uri.svg)](https://travis-ci.org/feross/magnet-uri) | [![](https://img.shields.io/npm/v/magnet-uri.svg)](https://npmjs.org/package/magnet-uri) | parse magnet uris
| [parse-torrent](https://github.com/feross/parse-torrent) | [![](https://img.shields.io/travis/feross/parse-torrent.svg)](https://travis-ci.org/feross/parse-torrent) | [![](https://img.shields.io/npm/v/parse-torrent.svg)](https://npmjs.org/package/parse-torrent) | parse torrent identifiers
| [parse-torrent-file](https://github.com/feross/parse-torrent-file) | [![](https://img.shields.io/travis/feross/parse-torrent-file.svg)](https://travis-ci.org/feross/parse-torrent-file) | [![](https://img.shields.io/npm/v/parse-torrent-file.svg)](https://npmjs.org/package/parse-torrent-file) | parse .torrent files
| [simple-peer](https://github.com/feross/simple-peer) | [![](https://img.shields.io/travis/feross/simple-peer.svg)](https://travis-ci.org/feross/simple-peer) | [![](https://img.shields.io/npm/v/simple-peer.svg)](https://npmjs.org/package/simple-peer) | webrtc wrapper api
| [simple-websocket](https://github.com/feross/simple-websocket) | [![](https://img.shields.io/travis/feross/simple-websocket.svg)](https://travis-ci.org/feross/simple-websocket) | [![](https://img.shields.io/npm/v/simple-websocket.svg)](https://npmjs.org/package/simple-websocket) | websocket wrapper api
| [string2compact](https://github.com/feross/string2compact) | [![](https://img.shields.io/travis/feross/string2compact.svg)](https://travis-ci.org/feross/string2compact) | [![](https://img.shields.io/npm/v/string2compact.svg)](https://npmjs.org/package/string2compact) | convert 'hostname:port' strings to compact
| [typedarray-to-buffer](https://github.com/feross/typedarray-to-buffer) | [![](https://img.shields.io/travis/feross/typedarray-to-buffer.svg)](https://travis-ci.org/feross/typedarray-to-buffer) | [![](https://img.shields.io/npm/v/typedarray-to-buffer.svg)](https://npmjs.org/package/typedarray-to-buffer) | efficient typedarray to buffer conversion
| [webtorrent-client](https://github.com/feross/webtorrent-client) | [![](https://img.shields.io/travis/feross/webtorrent-client.svg)](https://travis-ci.org/feross/webtorrent-client) | [![](https://img.shields.io/npm/v/webtorrent-client.svg)](https://npmjs.org/package/webtorrent-client) | work in progress
| [webtorrent-swarm](https://github.com/feross/webtorrent-swarm) | [![](https://img.shields.io/travis/feross/webtorrent-swarm.svg)](https://travis-ci.org/feross/webtorrent-swarm) | [![](https://img.shields.io/npm/v/webtorrent-swarm.svg)](https://npmjs.org/package/webtorrent-swarm) | work in progress
| [webtorrent-tracker](https://github.com/feross/webtorrent-tracker) | [![](https://img.shields.io/travis/feross/webtorrent-tracker.svg)](https://travis-ci.org/feross/webtorrent-tracker) | [![](https://img.shields.io/npm/v/webtorrent-tracker.svg)](https://npmjs.org/package/webtorrent-tracker) | work in progress
| bittorrent-verifier | | | TODO
| compress-sdp | | | TODO
| extension: ? | | | TODO: protocol encryption
| extension: ? | | | TODO: µTP
| extension: ? | | | TODO: UPnP and NAT-PMP port forwarding
| extension: ? | | | TODO: webseed support
| webtorrent-bootstrap | | | TODO
| webtorrent-dht | | | TODO
| webtorrent-verifier | | | TODO
| webworker-pool | | | TODO

#### Targets:
- [webtorrent.app](https://github.com/feross/webtorrent.app) (bittorrent client for os x, windows & linux -- coming soon)
- [webtorrent.js](https://github.com/feross/webtorrent.js) (bittorrent client for the browser -- coming soon)
- [webtorrent](https://github.com/feross/webtorrent) (bittorrent client for node.js)

#### The Node Way&trade;

"When applications are done well, they are just the really application-specific, brackish residue that can't be so easily abstracted away. All the nice, reusable components sublimate away onto github and npm where everybody can collaborate to advance the commons." — substack from ["how I write modules"](http://substack.net/how_I_write_modules)

![node.js is shiny](http://feross.net/x/node2.gif)

### Interoperability with BitTorrent

**Problem:** WebTorrent clients and normal BitTorrent clients cannot directly connect because WebRTC cannot open UDP/TCP sockets. This is a security restriction on WebRTC that is unlikely to change. So, how do we get content into the WebTorrent network?

**Best solution:** Mainstream BitTorrent clients add support for WebTorrent. Basically, normal clients implement WebRTC so that WebTorrent clients can directly connect to them. (This could happen once WebTorrent has a lot of users.)

**Good solution:** Users who want to download torrents that aren't yet seeded by any WebTorrent users need to install a "hybrid client" that implements WebTorrent **and** BitTorrent. This can be implemented as a native torrent client that bridges the two networks like this:

  - Hybrid clients can seed+leech from **both** WebTorrent and BitTorrent users.
  - Hybrid clients are DHT nodes in **both** the WebTorrent and BitTorrent DHTs.
  - The first time a hybrid client downloads a torrent that no other WebTorrent clients are seeding, they become the first WebTorrent seeder. (They essentially "bring" the file into the WebTorrent network).
  - Important note: Hybrid clients **never** download torrents on behalf of other users. That would be a terrible idea.
  - Until BitTorrent clients support WebTorrent, "pure" **WebTorrent clients can only download from other WebTorrent clients.**

### WebTorrent vs BitTorrent

- WebTorrent is slower at finding peers since "DHT over WebRTC" requires multiple roundtrips for peer introductions. (This is a requirement of WebRTC signaling - no way around this)
- WebTorrent peers must keep their browser tab open to seed (Show UI to encourage seeding back at least 2x)
- Slower piece verification (SHA1) (max 2MB/s with web worker pool, Web Crypto API will bring huge speed-up when it's finally ready)
- WebTorrent bootstrap DHT node does *a bit* more work than a BitTorrent one since it must do WebRTC signaling. (Not a huge deal)

### Todo for basic bitorrent client as node.js command line app

- ~~Use UDP/TCP APIs~~
- ~~Support DHT~~
- ~~Support peer wire protocol~~
- ~~Support magnet links (fetching .torrent from network)~~
- ~~Basic UI~~
- ~~Fetching logic~~
- ~~Large file saving (downloading in-memory for now, later IndexedDB/FileSystem API)~~
- ~~Streaming video~~
  - ~~HTTP stream to VLC, like peerflix~~

### Todo for webtorrent

- DHT over WebRTC (add new method for peer introduction)
  - Use bootstrap server for initial introduction
  - POST endpoint for sending offer/getting answer
- Easy torrent creation
- UPnP or NAT-PMP (so the hybrid client can get listed in peers' routing tables)
- Streaming video
  - MediaSource into `video` tag
  - Flash player for other media types

### Get started

```
git clone https://github.com/feross/webtorrent.git
cd webtorrent
npm install
npm start
```

### Contributors

WebTorrent is only possible due to the excellent work of the following contributors:

<table><tbody>
<tr><th align="left">Feross Aboukhadijeh</th><td><a href="https://github.com/feross">GitHub/feross</a></td><td><a href="http://twitter.com/feross">Twitter/@feross</a></td></tr>
<tr><th align="left">Daniel Posch</th><td><a href="https://github.com/dcposch">GitHub/dcposch</a></td><td><a href="http://twitter.com/dcposch">Twitter/@dcposch</a></td></tr>
<tr><th align="left">John Hiesey</th><td><a href="https://github.com/jhiesey">GitHub/jhiesey</a></td><td><a href="http://twitter.com/jhiesey">Twitter/@jhiesey</a></td></tr>
<tr><th align="left">Travis Fischer</th><td><a href="https://github.com/fisch0920">GitHub/fisch0920</a></td><td><a href="http://twitter.com/fisch0920">Twitter/@fisch0920</a></td></tr>
<tr><th align="left">Astro</th><td><a href="https://github.com/astro">GitHub/astro</a></td><td><a href="http://twitter.com/astro1138">Twitter/@astro1138</a></td></tr>
<tr><th align="left">Iván Todorovich</th><td><a href="https://github.com/ivantodorovich">GitHub/ivantodorovich</a></td><td><a href="http://twitter.com/ivantodorovich">Twitter/@ivantodorovich</a></td></tr>
<tr><th align="left">Mathias Buus</th><td><a href="https://github.com/mafintosh">GitHub/mafintosh</a></td><td><a href="http://twitter.com/mafintosh">Twitter/@mafintosh</a></td></tr>
<tr><th align="left">Bob Ren</th><td><a href="https://github.com/bobrenjc93">GitHub/bobrenjc93</a></td><td><a href="http://twitter.com/bobrenjc93">Twitter/@bobrenjc93</a></td></tr>
</tbody></table>

### Talks about WebTorrent

- [WebTorrent: Bringing BitTorrent to the Web with WebRTC (CraftConf)](https://www.youtube.com/watch?v=PT8s_IVWDgw) (April 2014, progress update on WebTorrent)
- [WebRTC Black Magic (RealtimeConf)](https://vimeo.com/77265280) (October 2013, where I first shared the idea for WebTorrent (skip to end for WebTorrent))

### License

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).

![Magic](https://raw.github.com/feross/webtorrent/master/img/logo.png)
