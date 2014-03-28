# ![WebTorrent](https://raw.github.com/feross/webtorrent/master/img/wordmark.png)
[![Build Status](http://img.shields.io/travis/feross/webtorrent.svg)](https://travis-ci.org/feross/webtorrent)
[![NPM Version](http://img.shields.io/npm/v/webtorrent.svg)](https://npmjs.org/package/webtorrent)
[![NPM](http://img.shields.io/npm/dm/webtorrent.svg)](https://npmjs.org/package/webtorrent)
[![Gittip](http://img.shields.io/gittip/feross.svg)](https://www.gittip.com/feross/)

### WebTorrent - Streaming BitTorrent client for the browser

> Warning: This is pre-alpha software. Nothing works yet. **Watch/star to follow along with progress.**


### Ways to help

- **Donations.** I fight for the users. JavaScript and WebRTC are my sword and shield. I'm currently working on WebTorrent almost every night in my spare time. Please support me if you believe in the vision. Send bitcoin to *1B6aystcqu8fd6ejzpmMFMPRqH9b86iiwh* or [donate via Coinbase](https://coinbase.com/checkouts/7c683397e33166651dedfebee6fb0f96).
- **Send pull requests.** Take a look at the [open issues](https://github.com/feross/webtorrent/issues?state=open) and see if there's something you can help with. Ideas and suggestions are welcome too.

## Planned Features

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


## Project Goal

Build a browser BitTorrent client that requires no install (no plugin/extension/etc.) and fully-interoperates with the regular BitTorrent network. Use WebRTC Data Channels for peer-to-peer transport.

Since WebTorrent is web-first, it's simple for users who do not understand .torrent files, magnet links, NATs, etc. By making BitTorrent easier, it will be accessible to new swathes of users who were previously intimidated, confused, or unwilling to install a program on their machine to participate.


## NPM Modules

Most of the active development is happening inside of smaller npm modules which will be used by WebTorrent. These are the modules I am writing to make WebTorrent work:

- [webtorrent](https://github.com/feross/webtorrent) (main repo)
- [bittorrent-dht](https://github.com/feross/bittorrent-dht)
- [bittorrent-protocol](https://github.com/feross/bittorrent-protocol)
  - [extension: ut_metadata](https://github.com/feross/ut_metadata)
  - extension: encryption (todo)
  - extension: peer exchange protocol (PEX) (todo)
  - extension: µTP (todo)
  - extension: UPnP and NAT-PMP port forwarding (todo)
  - extension: webseed support (todo)
- [bittorrent-swarm](https://github.com/feross/bittorrent-swarm)
- [bittorrent-tracker](https://github.com/feross/bittorrent-tracker)
- [buffer](https://github.com/feross/buffer)
- [chrome-dgram](https://github.com/feross/chrome-dgram)
- [chrome-net](https://github.com/feross/chrome-net)
- [chrome-portfinder](https://github.com/feross/chrome-portfinder)
- [drag-drop](https://github.com/feross/drag-drop)
- [magnet-uri](https://github.com/feross/magnet-uri)
- [parse-torrent](https://github.com/feross/parse-torrent)
- [string2compact](https://github.com/feross/string2compact)
- compress-sdp (todo)
- webtorrent-bootstrap (todo)
- webtorrent-chrome (todo)
- webtorrent-dht (todo)
- webtorrent-protocol (todo)
- webtorrent-swarm (todo)
- webtorrent-verifier (todo)
- webworker-pool (todo)

### The Node Way&trade;

"When applications are done well, they are just the really application-specific, brackish residue that can't be so easily abstracted away. All the nice, reusable components sublimate away onto github and npm where everybody can collaborate to advance the commons." — substack from ["how I write modules"](http://substack.net/how_I_write_modules)

![node.js is shiny](http://feross.net/x/node2.gif)


## Interoperability with BitTorrent

**Problem:** WebTorrent clients and normal BitTorrent clients cannot directly connect because WebRTC cannot open UDP/TCP sockets. This is a security restriction on WebRTC that is unlikely to change. So, how do we get content into the WebTorrent network?

**Best solution:** Mainstream BitTorrent clients add support for WebTorrent. Basically, normal clients implement WebRTC so that WebTorrent clients can directly connect to them. (This could happen once WebTorrent has a lot of users.)

**Good solution:** Users who want to download torrents that aren't yet seeded by any WebTorrent users need to install a "hybrid client" that implements WebTorrent **and** BitTorrent. This can be implemented as a Chrome/Firefox App/Extension that bridges the two networks like this:

  - Hybrid clients can seed+leech from **both** WebTorrent and BitTorrent users.
  - Hybrid clients are DHT nodes in **both** the WebTorrent and BitTorrent DHTs.
  - The first time a hybrid client downloads a torrent that no other WebTorrent clients are seeding, they become the first WebTorrent seeder. (They essentially "bring" the file into the WebTorrent network).
  - Important note: Hybrid clients **never** download torrents on behalf of other users. That would be a terrible idea.
  - Until BitTorrent clients support WebTorrent, "pure" **WebTorrent clients can only download from other WebTorrent clients.**


## WebTorrent vs BitTorrent

- WebTorrent is slower at finding peers since "DHT over WebRTC" requires multiple roundtrips for peer introductions. (This is a requirement of WebRTC signaling - no way around this)
- WebTorrent peers must keep their browser tab open to seed (Show UI to encourage seeding back at least 2x)
- Slower piece verification (SHA1) (max 2MB/s with web worker pool, Web Crypto API will bring huge speed-up when it's finally ready)
- WebTorrent bootstrap DHT node does *a bit* more work than a BitTorrent one since it must do WebRTC signaling. (Not a huge deal)


## Todo for basic bitorrent client as chrome app

- ~~Use UDP/TCP APIs~~
- ~~Support DHT~~
- ~~Support peer wire protocol~~
- ~~Support magnet links (fetching .torrent from network)~~
- ~~Basic UI~~
- ~~Fetching logic~~
- ~~Large file saving (downloading in-memory for now, later IndexedDB/FileSystem API)~~
- Streaming video, options:
  - HTTP stream to VLC, like peerflix
  - MediaSource into `video` tag
  - Flash player for other media types


## Todo for webtorrent

- DHT over WebRTC (add new method for peer introduction)
  - Use bootstrap server for initial introduction
  - POST endpoint for sending offer/getting answer
- Easy torrent creation
- UPnP or NAT-PMP (so the hybrid client can get listed in peers' routing tables)


## Run the app

```
git clone https://github.com/feross/webtorrent.git
cd webtorrent
npm install
npm start
```

(Currently requires Chrome Canary (OS X) to be installed, but this will be easy to fix)


## Introduction to WebRTC Data and WebTorrent

[Watch the talk](https://vimeo.com/77265280) from *RealtimeConf* on Vimeo (skip to end for stuff about WebTorrent):

[![webrtc talk](https://raw.github.com/feross/webtorrent/master/img/webrtc-talk.png)](https://vimeo.com/77265280)


## Useful Links

- [BitTorrent Spec (BEP 0003)](http://www.bittorrent.org/beps/bep_0003.html)
- [BitTorrent Spec (Wiki)](https://wiki.theory.org/BitTorrentSpecification)
- [Reference BitTorrent Client (BTPD)](https://github.com/btpd/btpd)
- [DHT Protocol](http://www.bittorrent.org/beps/bep_0005.html)
- [Kademlia Paper](http://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf)


## Contributors

- [Feross Aboukhadijeh](http://feross.org) (author)
- Daniel Posch
- John Hiesey
- *Contributions welcome! Add yourself here when you send a pull request.*


## License

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).

![Magic](https://raw.github.com/feross/webtorrent/master/img/logo.png)

