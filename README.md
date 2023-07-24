<h1 align="center">
  <br>
  <a href="https://webtorrent.io"><img src="https://webtorrent.io/img/WebTorrent.png" alt="WebTorrent" width="200"></a>
  <br>
  WebTorrent
  <br>
  <br>
</h1>

<h4 align="center">The streaming torrent client. For node.js and the web.</h4>

<p align="center">
  <a href="https://discord.gg/cnXkm4Z"><img src="https://img.shields.io/discord/612575111718895616" alt="discord"></a>
  <a href="https://github.com/webtorrent/webtorrent/actions"><img src="https://img.shields.io/github/actions/workflow/status/webtorrent/webtorrent/ci.yml?branch=master" alt="ci"></a>
  <a href="https://www.npmjs.com/package/webtorrent"><img src="https://img.shields.io/npm/v/webtorrent.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/webtorrent"><img src="https://img.shields.io/npm/dm/webtorrent.svg" alt="npm downloads"></a>
  <a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="Standard - JavaScript Style Guide"></a>
</p>

<h5 align="center">
  Sponsored by&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://socket.dev"><img src="https://webtorrent.io/img/supporters/socket.png" alt="Socket - JavaScript open source supply chain security" height=35 valign="middle"></a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://www.wormhole.app/?utm_medium=sponsorship&utm_source=webtorrent&utm_campaign=feross"><img src="https://webtorrent.io/img/supporters/wormhole.png" alt="Wormhole" height=30 valign="middle"></a>
</h5>
<br>

**WebTorrent** is a streaming torrent client for **node.js** and the **browser**. YEP,
THAT'S RIGHT. THE BROWSER. It's written completely in JavaScript – the language of the web
– so the same code works in both runtimes.

In node.js, this module is a simple torrent client, using TCP and UDP to talk to
other torrent clients.

In the browser, WebTorrent uses **WebRTC** (data channels) for peer-to-peer transport.
It can be used **without** browser plugins, extensions, or installations. It's Just
JavaScript&trade;. Note: WebTorrent does **not** support UDP/TCP peers in browser.

Simply include the
[`webtorrent.min.js`](https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js) script
on your page to start fetching files over WebRTC using the BitTorrent protocol, or
`import WebTorrent from 'webtorrent'` with [browserify](http://browserify.org/) or [webpack](https://webpack.js.org/). See [demo apps
](#who-is-using-webtorrent-today) and [code examples](#usage) below.

[![jsdelivr download count](https://data.jsdelivr.com/v1/package/npm/webtorrent/badge)](https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js)

To make BitTorrent work over WebRTC (which is the only P2P transport that works on the
web) we made some protocol changes. Therefore, a browser-based WebTorrent client or **"web
peer"** can only connect to other clients that support WebTorrent/WebRTC.

To seed files to web peers, use a client that supports WebTorrent, e.g.
[WebTorrent Desktop][webtorrent-desktop], a desktop client with a
familiar UI that can connect to web peers,
[webtorrent-hybrid](https://github.com/webtorrent/webtorrent-hybrid), a command line program,
or [Instant.io](https://instant.io/), a website. Established torrent clients like
**Vuze** have [already added WebTorrent support](https://wiki.vuze.com/w/WebTorrent) so
they can connect to both normal *and* web peers. We hope other clients will follow.

![Network](https://webtorrent.io/img/network.png)

### Features

- **Torrent client for node.js & the browser** (same npm package!)
- **Insanely fast**
- Download **multiple torrents** simultaneously, efficiently
- **Pure Javascript** (no native dependencies)
- Exposes files as **streams**
  - Fetches pieces from the network on-demand so seeking is supported (even before torrent is finished)
  - Seamlessly switches between sequential and rarest-first piece selection strategy
- Supports advanced torrent client features
  - **magnet uri** support via **[ut_metadata](https://github.com/webtorrent/ut_metadata)**
  - **peer discovery** via **[dht](https://github.com/webtorrent/bittorrent-dht)**,
    **[tracker](https://github.com/webtorrent/bittorrent-tracker)**,
    **[lsd](https://github.com/webtorrent/bittorrent-lsd)**, and
    **[ut_pex](https://github.com/webtorrent/ut_pex)**
  - **[protocol extension api](https://github.com/webtorrent/bittorrent-protocol#extension-api)**
    for adding new extensions
- **Comprehensive test suite** (runs completely offline, so it's reliable and fast)
- Check all the **[supported BEPs here](docs/bep_support.md)**

#### Browser/WebRTC environment features

- **WebRTC data channels** for lightweight peer-to-peer communication with **no plugins**
- **No silos.** WebTorrent is a P2P network for the **entire web.** WebTorrent clients
  running on one domain can connect to clients on any other domain.
- Stream video torrents into a `<video>` tag (`webm, mkv, mp4, ogv, mov, etc (AV1, H264, HEVC*, VP8, VP9, AAC, FLAC, MP3, OPUS, Vorbis, etc)`)
- Supports Chrome, Firefox, Opera and Safari.

<!-- <p align="center">
  <a href="https://saucelabs.com/u/webtorrent">
    <img src="https://saucelabs.com/browser-matrix/webtorrent.svg" alt="Sauce Labs">
  </a>
</p> -->

### Install

To install WebTorrent for use in node or the browser with `import WebTorrent from 'webtorrent'`, run:

```bash
npm install webtorrent
```

To install a `webtorrent`
[command line program](https://github.com/webtorrent/webtorrent-cli), run:

```bash
npm install webtorrent-cli -g
```

To install a WebTorrent desktop application for Mac, Windows, or Linux, see
[WebTorrent Desktop][webtorrent-desktop].

### Ways to help

- **Join us in [Gitter][webtorrent-gitter-url]** or on freenode at `#webtorrent` to help
  with development or to hang out with some mad science hackers :)
- **[Create a new issue](https://github.com/webtorrent/webtorrent/issues/new)** to report bugs
- **[Fix an issue](https://github.com/webtorrent/webtorrent/issues?state=open)**. WebTorrent
  is an [OPEN Open Source Project](https://github.com/webtorrent/.github/blob/master/CONTRIBUTING.md)!

### Who is using WebTorrent today?

**[Lots of folks!](docs/faq.md#who-is-using-webtorrent-today)**

### WebTorrent API Documentation

**[Read the full API Documentation](docs/api.md).**

### Usage

WebTorrent is the first BitTorrent client that works in the browser, using open web
standards (no plugins, just HTML5 and WebRTC)! It's easy to get started!

#### In the browser

##### Downloading a file is simple:

```js
import WebTorrent from 'webtorrent'

const client = new WebTorrent()
const magnetURI = '...'

client.add(magnetURI, torrent => {
  // Got torrent metadata!
  console.log('Client is downloading:', torrent.infoHash)

  for (const file of torrent.files) {
    document.body.append(file.name)
  }
})
```

##### Seeding a file is simple, too:

```js
import dragDrop from 'drag-drop'
import WebTorrent from 'webtorrent'

const client = new WebTorrent()

// When user drops files on the browser, create a new torrent and start seeding it!
dragDrop('body', files => {
  client.seed(files, torrent => {
    console.log('Client is seeding:', torrent.infoHash)
  })
})
```

There are more examples in [docs/get-started.md](docs/get-started.md).

##### Browserify

WebTorrent works great with [browserify](http://browserify.org/), an npm package that lets
you use [node](http://nodejs.org/)-style require() to organize your browser code and load modules installed by [npm](https://www.npmjs.com/) (as seen in the previous examples).

##### Webpack

WebTorrent also works with [webpack](https://webpack.js.org/), another module
bundler. However, webpack requires extra configuration which you can find in [the webpack bundle config used by webtorrent](/scripts/browser.webpack.js).


Or, you can just use the pre-built version via
`import WebTorrent from 'webtorrent/dist/webtorrent.min.js'` and skip the webpack configuration.

##### Script tag

WebTorrent is also available as a standalone script
([`webtorrent.min.js`](webtorrent.min.js)) which exposes `WebTorrent` on the `window`
object, so it can be used with just a script tag:

```html
<script type='module'>
  import WebTorrent from 'webtorrent.min.js'
</script>
```

The WebTorrent script is also hosted on fast, reliable CDN infrastructure (Cloudflare and
MaxCDN) for easy inclusion on your site:

```html
<script type='module'>
  import WebTorrent from 'https://esm.sh/webtorrent'
</script>
```

##### Chrome App

If you want to use WebTorrent in a
[Chrome App](https://developer.chrome.com/apps/about_apps), you can include the
following script:

```html
<script type='module'>
  import WebTorrent from 'webtorrent.chromeapp.js'
</script>
```

Be sure to enable the `chrome.sockets.udp` and `chrome.sockets.tcp` permissions!

#### In Node.js

WebTorrent also works in node.js, using the *same npm package!* It's mad science!

**NOTE**: To connect to "web peers" (browsers) in addition to normal BitTorrent peers, use
[webtorrent-hybrid](https://github.com/webtorrent/webtorrent-hybrid) which includes WebRTC
support for node.

#### As a command line app

WebTorrent is also available as a
[command line app](https://github.com/webtorrent/webtorrent-cli). Here's how to use it:

```bash
$ npm install webtorrent-cli -g
$ webtorrent --help
```

To download a torrent:

```bash
$ webtorrent magnet_uri
```

To stream a torrent to a device like **AirPlay** or **Chromecast**, just pass a flag:

```bash
$ webtorrent magnet_uri --airplay
```

There are many supported streaming options:

```bash
--airplay               Apple TV
--chromecast            Chromecast
--mplayer               MPlayer
--mpv                   MPV
--omx [jack]            omx [default: hdmi]
--vlc                   VLC
--xbmc                  XBMC
--stdout                standard out [implies --quiet]
```

In addition to magnet uris, WebTorrent supports [many ways](docs/api.md#clientaddtorrentid-opts-function-ontorrent-torrent-) to specify a torrent.

### Talks about WebTorrent

- Sep 2017 - Nordic JS - [Get Rich Quick With P2P Crypto Currency](https://www.youtube.com/watch?v=8N_4Furztjo)
- May 2017 - Char.la - [WebTorrent and Peerify](https://youtu.be/D-04vg5hvEQ?t=54m20s) (Spanish)
- Nov 2016 - NodeConf Argentina - [Real world Electron: Building Cross-platform desktop apps with JavaScript](https://www.youtube.com/watch?v=YLExGgEnbFY)
- May 2016 - SIGNAL Conference - [BitTorrent in the Browser](https://www.youtube.com/watch?v=2qrUx-C5Np4)
- May 2015 - Data Terra Nemo - [WebTorrent: Mother of all demos](https://www.youtube.com/watch?v=RRtNEcAaUO8)
- May 2015 - Data Terra Nemo - [WebRTC Everywhere](https://www.youtube.com/watch?v=RRtNEcAaUO8)
- Nov 2014 - JSConf Asia - [How WebTorrent Works](https://www.youtube.com/watch?v=kxHRATfvnlw)
- Sep 2014 - NodeConf EU - [WebRTC Mad Science](https://www.youtube.com/watch?v=BVBXkzVjvPc) (first working WebTorrent demo)
- Apr 2014 - CraftConf - [Bringing BitTorrent to the Web](https://www.youtube.com/watch?v=PT8s_IVWDgw)
- May 2014 - JS.LA - [How I Built a BitTorrent Client in the Browser](https://vimeo.com/97324247) (progress update; node client working)
- Oct 2013 - RealtimeConf - [WebRTC Black Magic](https://vimeo.com/77265280) (first mention of idea for WebTorrent)

### Modules

Most of the active development is happening inside of small npm packages which are used by WebTorrent.

#### The Node Way&trade;

> "When applications are done well, they are just the really application-specific, brackish residue that can't be so easily abstracted away. All the nice, reusable components sublimate away onto github and npm where everybody can collaborate to advance the commons." — substack from ["how I write modules"](https://gist.github.com/substack/5075355)

![node.js is shiny](https://feross.net/x/node2.gif)

#### Modules

These are the main modules that make up WebTorrent:

| module | tests | version | description |
|---|---|---|---|
| **[webtorrent][webtorrent]** | [![][webtorrent-ti]][webtorrent-tu] | [![][webtorrent-ni]][webtorrent-nu] | **torrent client (this module)**
| [bittorrent-dht][bittorrent-dht] | [![][bittorrent-dht-ti]][bittorrent-dht-tu] | [![][bittorrent-dht-ni]][bittorrent-dht-nu] | distributed hash table client
| [bittorrent-peerid][bittorrent-peerid] | [![][bittorrent-peerid-ti]][bittorrent-peerid-tu] | [![][bittorrent-peerid-ni]][bittorrent-peerid-nu] | identify client name/version
| [bittorrent-protocol][bittorrent-protocol] | [![][bittorrent-protocol-ti]][bittorrent-protocol-tu] | [![][bittorrent-protocol-ni]][bittorrent-protocol-nu] | bittorrent protocol stream
| [bittorrent-tracker][bittorrent-tracker] | [![][bittorrent-tracker-ti]][bittorrent-tracker-tu] | [![][bittorrent-tracker-ni]][bittorrent-tracker-nu] | bittorrent tracker server/client
| [bittorrent-lsd][bittorrent-lsd] | [![][bittorrent-lsd-ti]][bittorrent-lsd-tu] | [![][bittorrent-lsd-ni]][bittorrent-lsd-nu] | bittorrent local service discovery
| [create-torrent][create-torrent] | [![][create-torrent-ti]][create-torrent-tu] | [![][create-torrent-ni]][create-torrent-nu] | create .torrent files
| [magnet-uri][magnet-uri] | [![][magnet-uri-ti]][magnet-uri-tu] | [![][magnet-uri-ni]][magnet-uri-nu] | parse magnet uris
| [parse-torrent][parse-torrent] | [![][parse-torrent-ti]][parse-torrent-tu] | [![][parse-torrent-ni]][parse-torrent-nu] | parse torrent identifiers
| [torrent-discovery][torrent-discovery] | [![][torrent-discovery-ti]][torrent-discovery-tu] | [![][torrent-discovery-ni]][torrent-discovery-nu] | find peers via dht, tracker, and lsd
| [ut_metadata][ut_metadata] | [![][ut_metadata-ti]][ut_metadata-tu] | [![][ut_metadata-ni]][ut_metadata-nu] | metadata for magnet uris (protocol extension)
| [ut_pex][ut_pex] | [![][ut_pex-ti]][ut_pex-tu] | [![][ut_pex-ni]][ut_pex-nu] | peer discovery (protocol extension)

[webtorrent]: https://github.com/webtorrent/webtorrent
[webtorrent-gitter-url]: https://gitter.im/webtorrent/webtorrent

[webtorrent-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/webtorrent/ci.yml
[webtorrent-tu]: https://github.com/webtorrent/webtorrent/actions
[webtorrent-ni]: https://img.shields.io/npm/v/webtorrent.svg
[webtorrent-nu]: https://www.npmjs.com/package/webtorrent
[webtorrent-desktop]: https://webtorrent.io/desktop

[bittorrent-dht]: https://github.com/webtorrent/bittorrent-dht
[bittorrent-dht-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/bittorrent-dht/ci.yml?branch=master
[bittorrent-dht-tu]: https://github.com/webtorrent/bittorrent-dht/actions
[bittorrent-dht-ni]: https://img.shields.io/npm/v/bittorrent-dht.svg
[bittorrent-dht-nu]: https://www.npmjs.com/package/bittorrent-dht

[bittorrent-peerid]: https://github.com/webtorrent/bittorrent-peerid
[bittorrent-peerid-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/bittorrent-peerid/ci.yml?branch=master
[bittorrent-peerid-tu]: https://github.com/webtorrent/bittorrent-peerid/actions
[bittorrent-peerid-ni]: https://img.shields.io/npm/v/bittorrent-peerid.svg
[bittorrent-peerid-nu]: https://www.npmjs.com/package/bittorrent-peerid

[bittorrent-protocol]: https://github.com/webtorrent/bittorrent-protocol
[bittorrent-protocol-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/bittorrent-protocol/ci.yml?branch=master
[bittorrent-protocol-tu]: https://github.com/webtorrent/bittorrent-protocol/actions
[bittorrent-protocol-ni]: https://img.shields.io/npm/v/bittorrent-protocol.svg
[bittorrent-protocol-nu]: https://www.npmjs.com/package/bittorrent-protocol

[bittorrent-tracker]: https://github.com/webtorrent/bittorrent-tracker
[bittorrent-tracker-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/bittorrent-tracker/ci.yml?branch=master
[bittorrent-tracker-tu]: https://github.com/webtorrent/bittorrent-tracker/actions
[bittorrent-tracker-ni]: https://img.shields.io/npm/v/bittorrent-tracker.svg
[bittorrent-tracker-nu]: https://www.npmjs.com/package/bittorrent-tracker

[bittorrent-lsd]: https://github.com/webtorrent/bittorrent-lsd
[bittorrent-lsd-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/bittorrent-lsd/ci.yml?branch=master
[bittorrent-lsd-tu]: https://github.com/webtorrent/bittorrent-lsd/actions
[bittorrent-lsd-ni]: https://img.shields.io/npm/v/bittorrent-lsd.svg
[bittorrent-lsd-nu]: https://www.npmjs.com/package/bittorrent-lsd

[create-torrent]: https://github.com/webtorrent/create-torrent
[create-torrent-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/create-torrent/ci.yml?branch=master
[create-torrent-tu]: https://github.com/webtorrent/create-torrent/actions
[create-torrent-ni]: https://img.shields.io/npm/v/create-torrent.svg
[create-torrent-nu]: https://www.npmjs.com/package/create-torrent

[magnet-uri]: https://github.com/webtorrent/magnet-uri
[magnet-uri-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/magnet-uri/ci.yml?branch=master
[magnet-uri-tu]: https://github.com/webtorrent/magnet-uri/actions
[magnet-uri-ni]: https://img.shields.io/npm/v/magnet-uri.svg
[magnet-uri-nu]: https://www.npmjs.com/package/magnet-uri

[parse-torrent]: https://github.com/webtorrent/parse-torrent
[parse-torrent-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/parse-torrent/ci.yml?branch=master
[parse-torrent-tu]: https://github.com/webtorrent/parse-torrent/actions
[parse-torrent-ni]: https://img.shields.io/npm/v/parse-torrent.svg
[parse-torrent-nu]: https://www.npmjs.com/package/parse-torrent

[torrent-discovery]: https://github.com/webtorrent/torrent-discovery
[torrent-discovery-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/torrent-discovery/ci.yml?branch=master
[torrent-discovery-tu]: https://github.com/webtorrent/torrent-discovery/actions
[torrent-discovery-ni]: https://img.shields.io/npm/v/torrent-discovery.svg
[torrent-discovery-nu]: https://www.npmjs.com/package/torrent-discovery

[ut_metadata]: https://github.com/webtorrent/ut_metadata
[ut_metadata-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/ut_metadata/ci.yml?branch=master
[ut_metadata-tu]: https://github.com/webtorrent/ut_metadata/actions
[ut_metadata-ni]: https://img.shields.io/npm/v/ut_metadata.svg
[ut_metadata-nu]: https://www.npmjs.com/package/ut_metadata

[ut_pex]: https://github.com/webtorrent/ut_pex
[ut_pex-ti]: https://img.shields.io/github/actions/workflow/status/webtorrent/ut_pex/ci.yml?branch=master
[ut_pex-tu]: https://github.com/webtorrent/ut_pex/actions
[ut_pex-ni]: https://img.shields.io/npm/v/ut_pex.svg
[ut_pex-nu]: https://www.npmjs.com/package/ut_pex

#### Enable debug logs

In **node**, enable debug logs by setting the `DEBUG` environment variable to the name of the
module you want to debug (e.g. `bittorrent-protocol`, or `*` to print **all logs**).

```bash
DEBUG=* webtorrent
```

In the **browser**, enable debug logs by running this in the developer console:

```js
localStorage.setItem('debug', '*')
```

Disable by running this:

```js
localStorage.removeItem('debug')
```

### License

MIT. Copyright (c) [Feross Aboukhadijeh](https://feross.org) and [WebTorrent, LLC](https://webtorrent.io).
