webtorrent - BitTorrent over WebRTC
==========

A streaming torrent client in your browser, powered by webRTC and black magic.

**Watch / star repo to follow along with progress**

![Magic](https://raw.github.com/feross/webtorrent/master/logo.png)

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

Since WebTorrent is web-first, it's dead simple for users to use without undertanding .torrent, magnet links, clients, etc. By making BitTorrent easier, it will be accessible to new swathes of users who were previously intimidated, confused, or unwilling to install a program on their machine to participate.


## Interoperability with BitTorrent

**Problem:** WebTorrent clients and nortmal BitTorrent clients cannot directly connect because WebRTC cannot open UDP/TCP sockets. This is a security restriction on WebRTC that is unlikely to change. So, how do we get content into the WebTorrent network?

**Best solution:** Mainstream BitTorrent clients add support for WebTorrent. Basically, normal clients implement WebRTC so that WebTorrent clients can directly connect to them. (This could happen once WebTorrent has a lot of users.)

**Good solution:** Users who want to download torrents that aren't yet seeded by any WebTorrent users need to install a "hybrid client" that implements WebTorrent and BitTorrent. This can be implemented as a Chrome app/Firefox extension that bridges the networks like this:

  - Hybrid clients can seed/leech from **both** WebTorrent and BitTorrent users.
  - Hybrid clients are nodes in **both** the WebTorrent and BitTorrent DHT.
  - The first time a hybrid client downloads a torrent that no other WebTorrent clients were seeding, they become the first WebTorrent seeder. (They essentially "bring" the file into the WebTorrent network).
  - Note: Hybrid clients **never** download torrents on behalf of other users. That would be a terrible idea.

Until BitTorrent clients add support for WebTorrent, pure WebTorrent clients can only download from other WebTorrent clients.


## WebTorrent vs BitTorrent

- WebTorrent is slower at finding peers since "DHT over WebRTC" requires multiple roundtrips for peer introductions (WebRTC signaling)
- Peers must keep their browser tab open to seed (need UI to encourage seeding back at least 2x)
- Slower piece verification (SHA1) (max 2MB/s with web worker pool, Web Crpyto API will bring huge speed-up when it's ready)
- WebTorrent bootstrap DHT node does *a bit* more work than a BitTorrent one since it must do WebRTC signaling. Not a huge deal.


## Needed NPM modules

- webtorrent-chrome
- webtorrent
- webtorrent-protocol
- webtorrent-dht
- webtorrent-bootstrap
- webworker-pool
- webtorrent-verifier
- sdp-compress


## Todo to basic working version

- Build bittorrent client as Chrome App (connects to normal BT network)
  - Use UDP/TCP APIs
  - Support DHT
- Make WebRTC data channel work on the server
- DHT over WebRTC (add new method for peer introduction)
  - Use bootstrap server for initial introduction
  - POST endpoint for sending offer/getting answer
- Storage?
- Streaming video
  - MediaSource into `video` tag
  - Flash player for other media types
- Easy torrent creation

## Useful Links

- [BitTorrent Spec](https://wiki.theory.org/BitTorrentSpecification)

### DHT

- [DHT Protocol](http://www.bittorrent.org/beps/bep_0005.html)
- [Kademlia Paper](http://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf)
- [Main DHT implementation](https://github.com/jech/dht)
- [Optimized DHT bootstrap implementation](https://github.com/jech/dht-bootstrap)
