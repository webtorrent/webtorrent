webtorrent - BitTorrent over WebRTC
==========

A streaming torrent client in your browser, powered by webRTC and black magic.

**Watch / star repo to follow along with progress**

![Magic](https://raw.github.com/feross/webtorrent/master/img/logo.png)


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

Build a fully-interoperable web-based BitTorrent client that can be used without an install (no app/plugin/extension/etc.).

Since WebTorrent is web-first, it's dead simple for users to use without understanding .torrent, magnet links, clients, etc. By making BitTorrent easier, it will be accessible to new swathes of users who were previously intimidated, confused, or unwilling to install a program on their machine to participate.


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
- Slower piece verification (SHA1) (max 2MB/s with web worker pool, Web Crpyto API will bring huge speed-up when it's finally ready)
- WebTorrent bootstrap DHT node does *a bit* more work than a BitTorrent one since it must do WebRTC signaling. (Not a huge deal)


## NPM modules

"When applications are done well, they are just the really application-specific, brackish residue that can't be so easily abstracted away. All the nice, reusable components sublimate away onto github and npm where everybody can collaborate to advance the commons." -[substack](http://substack.net/how_I_write_modules)

- [webtorrent](https://github.com/feross/webtorrent) (this repo)
- [magnet-uri](https://github.com/feross/magnet-uri)
- webtorrent-protocol
- webtorrent-dht
- webtorrent-bootstrap
- webworker-pool
- webtorrent-verifier
- sdp-compress

### Hybrid client (Chrome App)

- webtorrent-chrome
- [chrome-app-socket](https://github.com/feross/chrome-app-socket)


## Todo for basic working version

- Build bittorrent client as Chrome App (connects to normal BT network)
  - ~~Use UDP/TCP APIs~~
  - ~~Support DHT~~
  - Support magnet links (fetching .torrent from network)
  - Support peer write protocol
  - Support large file saving (FileSystem API?)
- Make WebRTC data channel work on the server
- DHT over WebRTC (add new method for peer introduction)
  - Use bootstrap server for initial introduction
  - POST endpoint for sending offer/getting answer
- Storage?
- Streaming video
  - MediaSource into `video` tag
  - Flash player for other media types
- Easy torrent creation

## Todo eventually

- UPnP or NAT-PMP (so the hybrid client can get listed in peers' routing tables)

## Introduction to WebRTC Data and WebTorrent

[Watch the talk](https://vimeo.com/77265280) from *RealtimeConf* on Vimeo (skip to end for stuff about WebTorrent):

[![webrtc talk](https://raw.github.com/feross/webtorrent/master/img/webrtc-talk.png)](https://vimeo.com/77265280)


## Useful Links

- [BitTorrent Spec](https://wiki.theory.org/BitTorrentSpecification)
- [Reference BitTorrent Client (BTPD)](https://github.com/btpd/btpd)

### DHT

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
