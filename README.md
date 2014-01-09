# ![WebTorrent](https://raw.github.com/feross/webtorrent/master/img/wordmark.png)
### WebTorrent - Streaming BitTorrent client for the browser

[![Build Status](https://travis-ci.org/feross/webtorrent.png?branch=master)](https://travis-ci.org/feross/webtorrent)
[![Dependency Status](https://david-dm.org/feross/webtorrent.png)](https://david-dm.org/feross/webtorrent)
[![Gittip](http://img.shields.io/gittip/feross.png)](https://www.gittip.com/feross/)

> Warning: This is pre-alpha software. Nothing works yet. **Watch/star to follow along with progress.**

## Support development

[![Donate BitCoins](https://raw.github.com/feross/webtorrent/master/img/bitcoin.png)](https://coinbase.com/checkouts/7c683397e33166651dedfebee6fb0f96) Send Bitcoins to: **1B6aystcqu8fd6ejzpmMFMPRqH9b86iiwh**

## Project Goal

Build a browser BitTorrent client that requires no install (no plugin/extension/etc.) and fully-interoperates with the regular BitTorrent network. Use WebRTC Data Channels for peer-to-peer transport.

Since WebTorrent is web-first, it's simple for users who do not understand .torrent files, magnet links, NATs, etc. By making BitTorrent easier, it will be accessible to new swathes of users who were previously intimidated, confused, or unwilling to install a program on their machine to participate.

## NPM Modules

Most of the active development is happening inside of smaller npm modules which will be used by WebTorrent. These are the modules we are writing to make WebTorrent work:

- [webtorrent](https://github.com/feross/webtorrent) (main repo)
- [magnet-uri](https://github.com/feross/magnet-uri)
- [chrome-app-socket](https://github.com/feross/chrome-app-socket) (bundles [chrome-dgram](https://github.com/feross/chrome-dgram) & [chrome-net](https://github.com/feross/chrome-net))
- [native-buffer-browserify](https://github.com/feross/native-buffer-browserify)
- [bittorrent-protocol](https://github.com/feross/bittorrent-protocol)
- [bittorrent-dht](https://github.com/feross/bittorrent-dht) (work-in-progress)
- bittorrent-swarm (work-in-progress)
- webtorrent-protocol (todo)
- webtorrent-dht (todo)
- webtorrent-bootstrap (todo)
- webworker-pool (todo)
- webtorrent-verifier (todo)
- sdp-compress (todo)
- webtorrent-chrome (todo)

### The Node Way&trade;

"When applications are done well, they are just the really application-specific, brackish residue that can't be so easily abstracted away. All the nice, reusable components sublimate away onto github and npm where everybody can collaborate to advance the commons." — substack from ["how I write modules"](http://substack.net/how_I_write_modules)

![node.js is shiny](http://feross.net/x/node.gif)

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


## TODO for basic working version

- Build bittorrent client as Chrome App (connects to normal BT network)
  - ~~Use UDP/TCP APIs~~
  - ~~Support DHT~~
  - Support magnet links (fetching .torrent from network)
  - Support peer wire protocol
  - Support large file saving (FileSystem API?)
- Make WebRTC data channel work on the server
- DHT over WebRTC (add new method for peer introduction)
  - Use bootstrap server for initial introduction
  - POST endpoint for sending offer/getting answer
- Storage?
- Streaming video
  - MediaSource into `video` tag
  - Flash player for other media types


## Todo eventually

- Easy torrent creation
- UPnP or NAT-PMP (so the hybrid client can get listed in peers' routing tables)


## Introduction to WebRTC Data and WebTorrent

[Watch the talk](https://vimeo.com/77265280) from *RealtimeConf* on Vimeo (skip to end for stuff about WebTorrent):

[![webrtc talk](https://raw.github.com/feross/webtorrent/master/img/webrtc-talk.png)](https://vimeo.com/77265280)


## Useful Links

- [BitTorrent Spec (BEP 0003)](http://www.bittorrent.org/beps/bep_0003.html)
- [BitTorrent Spec (Wiki)](https://wiki.theory.org/BitTorrentSpecification)
- [Reference BitTorrent Client (BTPD)](https://github.com/btpd/btpd)
- [DHT Protocol](http://www.bittorrent.org/beps/bep_0005.html)
- [Kademlia Paper](http://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf)
- [Main DHT implementation](https://github.com/jech/dht)
- [Optimized DHT bootstrap implementation](https://github.com/jech/dht-bootstrap)


## Authors

- [Feross Aboukhadijeh](http://feross.org)
- John Hiesey


## Contributors

- *Contributions welcome! Add yourself here when you send a pull request.*

## License

MIT

![Magic](https://raw.github.com/feross/webtorrent/master/img/logo.png)
