# Frequently Asked Questions

## What is WebTorrent?

**WebTorrent** is the first torrent client that works in the **browser**. YEP,
THAT'S RIGHT. THE BROWSER.

It's written completely in JavaScript – the language of the web – and uses
**WebRTC** for true peer-to-peer transport. No browser plugin, extension, or
installation is required.

Using open web standards, WebTorrent connects website users together to form a
distributed, decentralized browser-to-browser network for efficient file transfer.

## Why is this cool?

Imagine a video site like YouTube, where **visitors help to host the site's
content**. The more people that use a WebTorrent-powered website, the faster and
more resilient it becomes.

Browser-to-browser communication **cuts out the middle-man** and lets people
communicate on their own terms. No more client/server – just a network of peers, all
equal. WebTorrent is the first step in the journey to
[redecentralize][redecentralize] the Web.

> The way we code the Web will determine the way we live online. So we need to bake
> our values into our code. Freedom of expression needs to be baked into our code.
> Privacy should be baked into our code. Universal access to all knowledge. But
> right now, those values are not embedded in the Web.
>
> <cite>— Brewster Kahle, Founder of the Internet Archive (from [Locking the Web Open][brewster])

## What are some use cases for WebTorrent?

One of the most exciting uses for WebTorrent is **peer-assisted delivery**.
Non-profit projects like [Wikipedia][wikipedia] and the [Internet
Archive][archive] could reduce bandwidth and hosting costs by letting visitors
chip in. Popular content is served browser-to-browser, quickly and cheaply.
Rarely-accessed content is served reliably over HTTP from the origin server.

There are also exciting **business use cases**, from CDNs to app delivery.

> WebTorrent has significant business potential to radically change the traditional
> notion of client-server, with applications for internal infrastructure and external
> closed user communications. WebTorrent has moved from an “idea” to a science
> experiment to now on the edge of being viable. This is like really, seriously cool.
>
> <cite>— Chris Kranky (from ["WebTorrent: Rethinking Delivery"][kranky-article])</cite>

[wikipedia]: https://www.wikipedia.org/
[archive]: https://archive.org/index.php
[kranky-article]: https://www.chriskranky.com/webtorrent-rethinking-delivery/
[redecentralize]: http://redecentralize.org/about/
[brewster]: https://blog.archive.org/2015/02/11/locking-the-web-open-a-call-for-a-distributed-web/

## Who is using WebTorrent today?

WebTorrent is still pretty new, but it's already being used in cool ways:

- **[WebTorrent Desktop][webtorrent-desktop]** - Open source streaming torrent client. For OS X, Windows, and Linux. ([source code][webtorrent-desktop-source])
- **[Instant.io][instant.io]** – Streaming file transfer over WebTorrent ([source code][instant.io-source])
- **[GitTorrent][gittorrent]** - Decentralized GitHub using BitTorrent and Bitcoin ([source code][gittorrent-source])
- **[PeerCloud][peercloud]** - Serverless websites via WebTorrent ([source code][peercloud-source])
- **[File.pizza][filepizza]** - Free peer-to-peer file transfers in your browser ([source code][filepizza-source])
- **[Webtorrentapp][webtorrentapp]** – Platform for launching web apps from torrents
- **[Fastcast][fastcast]** – Gallery site with some videos ([source code][fastcast-source])
- **[Colored Coins][coloredcoins]** - Open protocol for creating digital assets on the Blockchain ([source code][coloredcoins-source])
- **[Tokenly Pockets][pockets]** - Digital token issuance with WebTorrent-based metadata ([source code][pockets-source])
- **[βTorrent][btorrent]** - Fully-featured browser WebTorrent client ([source code][btorrent-source])
- **[Seedshot][seedshot]** - Peer to peer screenshot sharing from your browser ([source code][seedshot-source])
- **[PeerWeb][peerweb]** - Fetch and render a static website from a torrent
- **[Niagara][niagara]** - Video player webtorrent with subtitles (zipped .srt(s))
- **[Vique][vique]** - Video player queue to share videos
- **[YouShark][youshark]** - Web music player for WebTorrent ([source code][youshark-source])
- **[Peerify][peerify]** - Instant Web-seeded torrents for your files
- **[Instant-Share][instant-share]** - File sharing over WebTorrent
- **[P2PDrop][p2pdrop]** - Securely share files between peers ([source code][p2pdrop-source])
- **[Twister][twister]** - Decentralized microblogging service, using WebTorrent for media attachments ([source code][twister-source])
- **[PeerTube][peertube]** - Prototype of a decentralized video streaming platform in the web browser ([source-code][peertube-source])
- **[Cinematrix][cinematrix]** - Stream your favorite free content
- **[webtorrent-cljs][webtorrent-cljs]** - Clojurescript wrapper for WebTorrent
- ***Your app here – [Send a pull request][pr] with your URL!***

[webtorrent-desktop]: https://webtorrent.io/desktop
[webtorrent-desktop-source]: https://github.com/feross/webtorrent-desktop
[instant.io-source]: https://github.com/feross/instant.io
[gittorrent]: http://blog.printf.net/articles/2015/05/29/announcing-gittorrent-a-decentralized-github/
[gittorrent-source]: https://github.com/cjb/GitTorrent
[filepizza]: http://file.pizza/
[filepizza-source]: https://github.com/kern/filepizza
[peercloud]: https://peercloud.io/
[peercloud-source]: https://github.com/jhiesey/peercloud
[webtorrentapp]: https://github.com/alexeisavca/webtorrentapp
[fastcast]: http://fastcast.nz
[fastcast-source]: https://github.com/fastcast/fastcast
[coloredcoins]: http://coloredcoins.org
[coloredcoins-source]: https://github.com/Colored-Coins/Metadata-Handler
[pockets]: https://tokenly.com/
[pockets-source]: https://github.com/loon3/Tokenly-Pockets
[btorrent]: https://btorrent.xyz
[btorrent-source]: https://github.com/DiegoRBaquero/bTorrent
[seedshot]: http://seedshot.io/
[seedshot-source]: https://github.com/twobucks/seedshot
[peerweb]: https://github.com/retrohacker/peerweb.js
[niagara]: https://andreapaiola.name/niagara/
[vique]: https://andreapaiola.name/vique/
[youshark]: http://youshark.neocities.org/
[youshark-source]: https://github.com/enorrmann/youshark
[peerify]: https://peerify.btorrent.xyz
[instant-share]: http://fs.lunik.xyz/
[p2pdrop]: http://p2pdrop.com
[p2pdrop-source]: https://github.com/ajainvivek/P2PDrop
[twister]: http://twister.net.co/?p=589
[twister-source]: https://github.com/miguelfreitas/twister-html
[peertube]: http://peertube.cpy.re
[peertube-source]: https://github.com/Chocobozzz/PeerTube
[cinematrix]: http://cinematrix.one/
[webtorrent-cljs]: https://github.com/cvillecsteele/webtorrent-cljs

## How does WebTorrent work?

The WebTorrent protocol works just like [BitTorrent protocol][bittorrent-protocol],
except it uses [WebRTC][webrtc] instead of [TCP][tcp]/[uTP][utp] as the transport
protocol.

In order to support [WebRTC's connection model][webrtc-signaling], we made a few
changes to the tracker protocol. Therefore, a browser-based WebTorrent client or
**"web peer"** can only connect to other clients that support WebTorrent/WebRTC.

The protocol changes we made will be published as a
[BEP](http://www.bittorrent.org/beps/bep_0001.html). Until a spec is written, you
can view the source code of the [`bittorrent-tracker`][bittorrent-tracker] package.

Once peers are connected, the wire protocol used to communicate is exactly the same
as in normal BitTorrent. This should make it easy for existing popular torrent
clients like Transmission, and uTorrent to add support for WebTorrent. **Vuze**
[already has support][vuze-support] for WebTorrent!

![WebTorrent network diagram](https://webtorrent.io/img/network.png)

[bittorrent-protocol]: https://wiki.theory.org/BitTorrentSpecification
[webrtc-signaling]: http://www.html5rocks.com/en/tutorials/webrtc/infrastructure/#what-is-signaling
[tcp]: https://en.wikipedia.org/wiki/Transmission_Control_Protocol
[utp]: https://en.wikipedia.org/wiki/Micro_Transport_Protocol
[webrtc]: https://en.wikipedia.org/wiki/WebRTC
[bittorrent-tracker]: https://npmjs.com/package/bittorrent-tracker
[vuze-support]: https://wiki.vuze.com/w/WebTorrent

## How do I get started?

To start using WebTorrent, simply include the
[`webtorrent.min.js`](https://cdn.jsdelivr.net/webtorrent/latest/webtorrent.min.js)
script on your page. If you use [browserify](http://browserify.org/), you can
`npm install webtorrent` and `require('webtorrent')`.

It's easy to download a torrent and add it to the page.

```js
var client = new WebTorrent()

var torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel-1024-surround.mp4'

client.add(torrentId, function (torrent) {
  var file = torrent.files[0]
  file.appendTo('body') // append the file to the DOM
})
```

This supports video, audio, images, PDFs, Markdown, [and more][append-to], right
out of the box. There are additional ways to access file content directly, including
as a node-style stream, Buffer, or Blob URL.

Video and audio content can be streamed, i.e. playback will start before the full
file is downloaded. Seeking works too – WebTorrent dynamically fetches
the needed torrent pieces from the network on-demand.

## What is WebRTC?

WebRTC (Web Real-Time Communication) is an API defined by the World Wide Web
Consortium (W3C) to support browser-to-browser applications like voice calling,
video chat, and P2P file sharing without the need for browser plugins.

WebRTC's `RTCDataChannel` API allows the transfer of data directly from one browser
to another. This is distinct from `WebSocket` and `XMLHttpRequest` because these are
designed for communication to/from a server, i.e. a client-server model. Data
Channels allow for **direct browser-to-browser connections**.

This is revolutionary. Never before could websites connect their users directly to
each other with super low-latency, encrypted, peer-to-peer connections. This will
enable next-generation applications in healthcare, education, science, and more.
WebTorrent is just one example.

WebRTC [works everywhere][webrtc-everywhere], and browser support is excellent.
**Chrome**, **Firefox**, and **Opera** for Desktop and Android, as well as
**Microsoft Edge** have support.

You can learn more about WebRTC data channels at [HTML5Rocks][datachannel-intro].

[webrtc-everywhere]: https://speakerdeck.com/feross/webrtc-everywhere-beyond-the-browser-at-data-terra-nemo-2015
[datachannel-intro]: http://www.html5rocks.com/en/tutorials/webrtc/datachannels/

## Can WebTorrent clients connect to normal BitTorrent clients?

In the browser, WebTorrent can only download torrents that are seeded by a
WebRTC-capable torrent client.

Right now, we know of these WebRTC-capable torrent clients:

- **[WebTorrent Desktop][webtorrent-desktop]** - Open source streaming torrent client. For OS X, Windows, and Linux.
- **[Vuze][vuze-support]** - Powerful, full-featured torrent client
- **[Playback][playback]** - Open source JavaScript video player **(super cool!)**
- **[`webtorrent-hybrid`][webtorrent-hybrid]** - Node.js package (command line and API)
- **[Instant.io][instant.io]** - Simple WebTorrent client in a website
- **[βTorrent][btorrent]** - Fully-featured browser WebTorrent client ([source code][btorrent-source])
- *More coming soon – [Send a PR][pr] to add your client to the list!*

### A bit more about `webtorrent-hybrid`

In node.js, `webtorrent-hybrid` can download torrents from WebRTC peers or TCP peers
(i.e. normal peers). You can use WebTorrent as a command line program, or
programmatically as a node.js package.

To install `webtorrent-hybrid` run the following command in your terminal (add the
`-g` flag to install the command line program, omit it to install locally):

```
npm install webtorrent-hybrid -g
```

Note: If you just need to use WebTorrent in the browser (where WebRTC is available
natively) then use [`webtorrent`][webtorrent] instead, which is faster to install because
it won't need to install a WebRTC implementation.

## Can WebTorrent clients on different websites connect to each other?

Yes! **WebTorrent works across the entire web.** WebTorrent clients running on one
domain can connect to clients on any other domain. No silos!

The same-origin policy does not apply to WebRTC connections since they are not
client-to-server. Browser-to-browser connections require the cooperation of both
websites (i.e. the WebTorrent script must be present on both sites).

## Who builds WebTorrent?

WebTorrent is built by [Feross Aboukhadijeh][feross] and hundreds of open source
contributors. The non-profit WebTorrent project is managed by
[WebTorrent, LLC][webtorrent-io].

Feross's other projects include [JavaScript Standard Style][standard],
[PeerCDN][peercdn] (sold to Yahoo), [Study Notes][studynotes], and
[YouTube Instant][ytinstant].

In the past, Feross attended [Stanford University][stanford], did research in the
[Stanford Human-Computer Interaction][hci] and [Computer Security][seclab] labs, and worked
at [Quora][quora], [Facebook][facebook], and [Intel][intel].

[standard]: http://standardjs.com/
[studynotes]: https://www.apstudynotes.org/
[ytinstant]: http://ytinstant.com/
[stanford]: http://www.stanford.edu/
[hci]: http://hci.stanford.edu/
[seclab]: http://seclab.stanford.edu/
[quora]: https://www.quora.com/
[facebook]: https://www.facebook.com/
[intel]: http://intel.com/

## What is WebTorrent, LLC?

"WebTorrent, LLC" is the legal entity that owns WebTorrent. WebTorrent is, and
always will be, **non-profit, open source, and free software**.

There are no plans to make a profit from WebTorrent.

## How is WebTorrent different from PeerCDN?

[PeerCDN][peercdn] is a next-generation CDN powered by WebRTC for efficient
peer-to-peer delivery of website content. PeerCDN was founded by
[Feross Aboukhadijeh][feross], [Abi Raja][abi], and [John Hiesey][jhiesey] in
March 2013 and was sold to [Yahoo][yahoo] in December 2013.

WebTorrent is an independent project started by [Feross Aboukhadijeh][feross] in
October 2013. Unlike PeerCDN, **WebTorrent is free software**, licensed under the [MIT
License][license]. You're free to use it however you like!

> "Free software" is a matter of liberty, not price. To understand the concept, you
> should think of "free" as in "free speech," not as in "free beer."
>
> <cite>— Richard Stallman, software freedom activist</cite>

On a technical level, PeerCDN and WebTorrent were built with different goals in
mind. PeerCDN was optimized for low-latency downloads and fast peer discovery. This
meant the client and site owner trusted centralized servers to map file URLs to
content hashes.

WebTorrent, on the other hand, doesn't require clients to trust a centralized
server. Given a `.torrent` file or magnet link, the WebTorrent client downloads the
file without trusting servers or peers at any point.

[feross]: http://feross.org/
[abi]: http://abiraja.com/
[jhiesey]: https://github.com/jhiesey
[yahoo]: https://www.yahoo.com/

## How can I contribute?

WebTorrent is an **OPEN Open Source Project**. Individuals who make significant and
valuable contributions are given commit access to the project to contribute as they
see fit. (See the full [contributor guidelines][contributing].)

There are many ways to help out!

- Report bugs by [creating a GitHub issue][issues].
- Write code to [fix an open issue][open-issues].

If you're looking for help getting started, come join us in [Gitter][gitter] or on
IRC at `#webtorrent` (freenode) and how you can get started.


[open-issues]: https://github.com/feross/webtorrent/issues?state=open
[contributing]: https://github.com/feross/webtorrent/blob/master/CONTRIBUTING.md

## Where can I learn more?

There are many talks online about WebTorrent. Here are a few:

### Intro to BitTorrent and WebTorrent (JSConf)

<iframe width="853" height="480" src="https://www.youtube.com/embed/kxHRATfvnlw?rel=0" frameborder="0" allowfullscreen></iframe>

### WebRTC Everywhere: Beyond the Browser (slides only)

<script async class="speakerdeck-embed" data-id="cb08869f2ac2445c99e8b73a4ac65d2b" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

# Troubleshooting

## Why does browser downloading not work? I see no peers!

It does work! But you can't just use any random magnet uri or `.torrent` file. The
torrent must be seeded by a WebRTC-capable client, i.e.
[WebTorrent Desktop][webtorrent-desktop], [Vuze][vuze-support],
[webtorrent-hybrid][webtorrent-hybrid], [Playback][playback], [instant.io][instant.io], or
[βTorrent][btorrent].

In the browser, WebTorrent can only download torrents that are explicitly seeded to
web peers via a WebRTC-capable client. Desktop torrent clients need to support
WebRTC to connect to web browsers.

## Why does video/audio streaming not work?

Streaming support depends on support for `MediaSource` API in the browser. All
modern browsers have `MediaSource` support. In Firefox, support was added in
Firefox 42 (i.e. Firefox Nightly).

[Many file types][append-to] are supported (again, depending on browser support),
but only `.mp4`, `.m4v`, and `.m4a`       have full support, including seeking.

To support video/audio streaming of arbitrary files, WebTorrent uses the
[`videostream`][videostream] package, which in turn uses [`mp4box.js`][mp4box.js].
If you think there may be a bug in one of these packages, please file an issue on
the respective repository.

[videostream]: https://npmjs.com/package/videostream
[mp4box.js]: https://github.com/gpac/mp4box.js

## Got more questions?

Open an issue on the WebTorrent [issue tracker][issues], or join us in
[Gitter][gitter] or on IRC at `#webtorrent` (freenode).

[webtorrent-io]: https://webtorrent.io
[append-to]: https://github.com/feross/webtorrent/blob/master/lib/append-to.js#L6-L14
[gitter]: https://gitter.im/feross/webtorrent
[instant.io]: https://instant.io
[issues]: https://github.com/feross/webtorrent/issues
[license]: https://github.com/feross/webtorrent/blob/master/LICENSE
[peercdn]: http://www.peercdn.com/
[playback]: https://mafintosh.github.io/playback/
[pr]: https://github.com/feross/webtorrent
[webtorrent-hybrid]: https://npmjs.com/package/webtorrent-hybrid
[webtorrent]: https://npmjs.com/package/webtorrent
