# ![WebTorrent](https://webtorrent.io/img/wordmark.png)

[![Gitter][webtorrent-gitter-image]][webtorrent-gitter-url]
[![Build Status][webtorrent-ti]][webtorrent-tu]
[![NPM Version][webtorrent-ni]][webtorrent-nu]
[![NPM Downloads][webtorrent-downloads-image]][webtorrent-downloads-url]

### Streaming torrent client for node & the browser

[![Sauce Test Status][webtorrent-sauce-image]][webtorrent-sauce-url]
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](http://standardjs.com)

**WebTorrent** is a streaming torrent client for **node.js** and the **browser**. YEP,
THAT'S RIGHT. THE BROWSER. It's written completely in JavaScript – the language of the web
– so the same code works in both runtimes.

In node.js, this module is a simple torrent client, using TCP and UDP to talk to
other torrent clients.

In the browser, WebTorrent uses **WebRTC** (data channels) for peer-to-peer transport.
It can be used **without** browser plugins, extensions, or installations. It's Just
JavaScript&trade;. Note: WebTorrent does **not** support UDP/TCP peers in browser.

Simply include the
[`webtorrent.min.js`](https://cdn.jsdelivr.net/webtorrent/latest/webtorrent.min.js) script
on your page to start fetching files over WebRTC using the BitTorrent protocol, or
`require('webtorrent')` with [browserify](http://browserify.org/). See [demo apps
](#webtorrent-in-production) and [code examples](#usage) below.

To make BitTorrent work over WebRTC (which is the only P2P transport that works on the
web) we made some protocol changes. Therefore, a browser-based WebTorrent client or **"web
peer"** can only connect to other clients that support WebTorrent/WebRTC.

To seed files to web peers, use a client that supports WebTorrent, e.g.
[webtorrent-hybrid](https://github.com/feross/webtorrent-hybrid) or
[instant.io](https://instant.io/). We're also working on
[WebTorrent.app](https://github.com/feross/WebTorrent.app), a desktop client with a
familiar UI that can connect to web peers. We hope established torrent clients
(Transmission, Vuze, uTorrent, etc.) will add support for WebTorrent so they too can
connect to both normal *and* web peers.

![Network](https://webtorrent.io/img/network.png)

> Warning: This is alpha software. **Watch/star to follow along with progress.**

### Features

- **Torrent client for node.js & the browser** (same npm module!)
- **Insanely fast**
- Download **multiple torrents** simultaneously, efficiently
- **Pure Javascript** (no native dependencies)
- Exposes files as **streams**
  - Fetches pieces from the network on-demand so seeking is supported (even before torrent is finished)
  - Seamlessly switches between sequential and rarest-first piece selection strategy
- Supports advanced torrent client features
  - **magnet uri** support via **[ut_metadata](https://github.com/feross/ut_metadata)**
  - **peer discovery** via **[dht](https://github.com/feross/bittorrent-dht)**,
    **[tracker](https://github.com/feross/bittorrent-tracker)**, and
    **[ut_pex](https://github.com/fisch0920/ut_pex)**
  - **[protocol extension api](https://github.com/feross/bittorrent-protocol#extension-api)**
    for adding new extensions
- **Comprehensive test suite** (runs completely offline, so it's reliable and fast)

#### Browser-only features

- **WebRTC data channels** for lightweight peer-to-peer communication with **no plugins**
- **No silos.** WebTorrent is a P2P network for the **entire web.** WebTorrent clients
  running on one domain can connect to clients on any other domain.
- Stream video torrents into a `<video>` tag (`webm (vp8, vp9)` or `mp4 (h.264)`)
- Supports Chrome, Firefox, and Opera.

#### Node-only features

- Stream to **AirPlay**, **Chromecast**, **VLC player**, and many other devices/players

**NOTE**: To connect to "web peers" (browsers) in addition to normal BitTorrent peers, use
  [webtorrent-hybrid](https://github.com/feross/webtorrent-hybrid) which includes WebRTC
  support for node.

### Install

To install WebTorrent for use in node or the browser with `require('webtorrent')`, run:

```bash
npm install webtorrent
```

To install a `webtorrent` command line program, run:

```bash
npm install webtorrent -g
```

### Ways to help

- **Join us in [Gitter][webtorrent-gitter-url]** or on freenode at `#webtorrent` to help
  with development or to hang out with some mad science hackers :)
- **[Create a new issue](https://github.com/feross/webtorrent/issues/new)** to report bugs
- **[Fix an issue](https://github.com/feross/webtorrent/issues?state=open)**. Note:
  WebTorrent is an [OPEN Open Source Project](CONTRIBUTING.md)!

### WebTorrent in production

- **[Instant.io](https://instant.io/)** – Streaming file transfer over WebTorrent ([source code](https://github.com/feross/instant.io))
- **[Fastcast](http://fastcast.nz)** – Stream peer-to-peer audio and video content ([source code](https://github.com/fastcast/fastcast))
- **[Webtorrentapp](https://github.com/alexeisavca/webtorrentapp)** – A tool/platform for launching web apps from torrents
- **[People-driven web](http://www.peopledrivenweb.com/)** – Decentralized content management system ([source code](https://github.com/peopledrivenweb/pwjs))
- **[PeerCloud](https://github.com/jhiesey/peercloud)** - Serverless websites via WebTorrent
- **[βTorrent](https://btorrent.xyz)** - Fully-featured WebTorrent browser client ([source code](https://github.com/DiegoRBaquero/bTorrent))
- **[Niagara](http://andreapaiola.name/niagara/)** - Video player webtorrent with subtitles (zipped .srt(s))
- **[Seedshot](https://github.com/twobucks/seedshot)** - Ephemeral P2P screenshot sharing
- Your app here! (send a PR or open an issue with your app's URL)

### Usage

WebTorrent is the first BitTorrent client that works in the browser, using open web
standards (no plugins, just HTML5 and WebRTC)! It's easy to get started!

#### In the browser

##### Downloading a file is simple:

```js
var WebTorrent = require('webtorrent')

var client = new WebTorrent()
var magnetURI = '...'

client.add(magnetURI, function (torrent) {
  // Got torrent metadata!
  console.log('Client is downloading:', torrent.infoHash)

  torrent.files.forEach(function (file) {
    // Display the file by appending it to the DOM. Supports video, audio, images, and
    // more. Specify a container element (CSS selector or reference to DOM node).
    file.appendTo('body')
  })
})
```

##### Seeding a file is simple, too:

```js
var dragDrop = require('drag-drop')
var WebTorrent = require('webtorrent')

var client = new WebTorrent()

// When user drops files on the browser, create a new torrent and start seeding it!
dragDrop('body', function (files) {
  client.seed(files, function (torrent) {
    console.log('Client is seeding:', torrent.infoHash)
  })
})
```

There are more examples in the [examples](https://github.com/feross/webtorrent/tree/master/examples) folder.

##### Browserify

WebTorrent works great with [browserify](http://browserify.org/), an npm module that let's
you use [node](http://nodejs.org/)-style require() to organize your browser code and load modules installed by [npm](https://npmjs.org/) (as seen in the previous examples).

WebTorrent is also available as a standalone script
([`webtorrent.min.js`](webtorrent.min.js)) which exposes `WebTorrent` on the `window`
object, so it can be used with just a script tag:

```html
<script src="webtorrent.min.js"></script>
```

The WebTorrent script is also hosted on fast, reliable CDN infrastructure (Cloudflare and
MaxCDN) for easy inclusion on your site:

```html
<script src="https://cdn.jsdelivr.net/webtorrent/latest/webtorrent.min.js"></script>
```

#### In node.js

WebTorrent also works in node.js, using the *same npm module!* It's mad science!

#### As a command line app

WebTorrent is available as a command line app. Here's how to use it:

```bash
$ npm install webtorrent -g
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

In addition to magnet uris, webtorrent supports [many ways to specify a torrent](#clientaddtorrentid-opts-function-ontorrent-torrent-).

### API

This API should work exactly the same in node and the browser. Open an issue if this is
not the case.

#### `WebTorrent.WEBRTC_SUPPORT`

Detect native WebRTC support in the environment.

```js
if (WebTorrent.WEBRTC_SUPPORT) {
  // webrtc support!
} else {
  // fallback
}
```

#### `client = new WebTorrent([opts])`

Create a new `WebTorrent` instance.

If `opts` is specified, then the default options (shown below) will be overridden.

``` js
{
  dht: Boolean|Object,   // Enable DHT (default=true), or options object for DHT
  maxConns: Number,      // Max number of connections per torrent (default=55)
  nodeId: String|Buffer, // DHT protocol node ID (default=randomly generated)
  peerId: String|Buffer, // Wire protocol peer ID (default=randomly generated)
  rtcConfig: Object,     // RTCPeerConnection configuration object (default=STUN only)
  tracker: Boolean,      // Whether or not to enable trackers (default=true)
  wrtc: Object           // Custom webrtc implementation (in node, specify the [wrtc](https://www.npmjs.com/package/wrtc) package)
}
```

#### `client.add(torrentId, [opts], [function ontorrent (torrent) {}])`

Start downloading a new torrent. Aliased as `client.download`.

`torrentId` can be one of:

- magnet uri (string)
- torrent file (buffer)
- info hash (hex string or buffer)
- parsed torrent (from [parse-torrent](https://github.com/feross/parse-torrent))
- http/https url to a torrent file (string)
- filesystem path to a torrent file (string)

If `opts` is specified, then the default options (shown below) will be overridden.

```js
{
  announce: [],   // Torrent trackers to use (added to list in .torrent or magnet uri)
  path: String,   // Folder to download files to (default=`/tmp/webtorrent/`)
  store: Function // Custom chunk store (must follow [abstract-chunk-store](https://www.npmjs.com/package/abstract-chunk-store) API)
}
```

If `ontorrent` is specified, then it will be called when **this** torrent is ready to be
used (i.e. metadata is available). Note: this is distinct from the 'torrent' event which
will fire for **all** torrents.

If you want access to the torrent object immediately in order to listen to events as the
metadata is fetched from the network, then use the return value of `client.add`. If you
just want the file data, then use `ontorrent` or the 'torrent' event.

#### `client.seed(input, [opts], [function onseed (torrent) {}])`

Start seeding a new torrent.

`input` can be any of the following:

- path to the file or folder on filesystem (string) (Node.js only)
- W3C [File](https://developer.mozilla.org/en-US/docs/Web/API/File) object (from an `<input>` or drag and drop)
- W3C [FileList](https://developer.mozilla.org/en-US/docs/Web/API/FileList) object (basically an array of `File` objects)
- Node [Buffer](http://nodejs.org/api/buffer.html) object (works in [the browser](https://www.npmjs.org/package/buffer))

Or, an **array of `string`, `File`, or `Buffer` objects**.

If `opts` is specified, it should contain the following types of options:

- options for [create-torrent](https://github.com/feross/create-torrent#createtorrentinput-opts-function-callback-err-torrent-) (to allow configuration of the .torrent file that is created)
- options for `client.add` (see above)

If `onseed` is specified, it will be called when the client has begun seeding the file.

#### `client.on('torrent', function (torrent) {})`

Emitted when a torrent is ready to be used (i.e. metadata is available and store is
ready). See the torrent section for more info on what methods a `torrent` has.

#### `client.remove(torrentId, [function callback (err) {}])`

Remove a torrent from the client. Destroy all connections to peers and delete all saved
file data. If `callback` is specified, it will be called when file data is removed.

#### `client.destroy([function callback (err) {}])`

Destroy the client, including all torrents and connections to peers. If `callback` is specified, it will be called when the client has gracefully closed.

#### `client.torrents[...]`

An array of all torrents in the client.

#### `client.get(torrentId)`

Returns the torrent with the given `torrentId`. Convenience method. Easier than searching
through the `client.torrents` array. Returns `null` if no matching torrent found.

#### `client.ratio`

Seed ratio for all torrents in the client.

### torrent api

#### `torrent.infoHash`

Get the info hash of the torrent.

#### `torrent.magnetURI`

Get the magnet URI of the torrent.

#### `torrent.files[...]`

An array of all files in the torrent. See the file section for more info on what methods
the file has.

#### `torrent.swarm`

The attached [bittorrent-swarm](https://github.com/feross/bittorrent-swarm) instance.

#### `torrent.received`

Get total bytes received from peers (including invalid data).

#### `torrent.downloaded`

Get total bytes received from peers (excluding invalid data).

#### `torrent.timeRemaining`

Get the time remaining in millis if downloading.

#### `torrent.progress`

Get the total progress from 0 to 1.

#### `torrent.ratio`

Get the torrent ratio (seeded/downloaded).

#### `torrent.downloadSpeed`

Returns the download speed.

#### `torrent.uploadSpeed`

Returns the current upload speed.

#### `torrent.path`

Get the torrent download location.

#### `torrent.destroy()`

Alias for `client.remove(torrent)`.

#### `torrent.addPeer(addr)`

Adds a peer to the underlying [bittorrent-swarm](https://github.com/feross/bittorrent-swarm) instance.

Returns `true` if peer was added, `false` if peer was blocked by the loaded blocklist.

#### `torrent.select(start, end, [priority], [notify])`

Selects a range of pieces to prioritize starting with `start` and ending with `end` (both inclusive)
at the given `priority`. `notify` is an optional callback to be called when the selection is updated
with new data.

#### `torrent.deselect(start, end, priority)`

Deprioritizes a range of previously selected pieces.

#### `torrent.critical(start, end)`

Marks a range of pieces as critical priority to be downloaded ASAP. From `start` to `end`
(both inclusive).

#### `torrent.createServer([opts])`

Create an http server to serve the contents of this torrent, dynamically fetching the
needed torrent pieces to satisfy http requests. Range requests are supported.

Returns an `http.Server` instance (got from calling `http.createServer`). If `opts` is specified, it is passed to the `http.createServer` function.

Visiting the root of the server `/` will show a list of links to individual files. Access
individual files at `/<index>` where `<index>` is the index in the `torrent.files` array
(e.g. `/0`, `/1`, etc.)

Here is a usage example:

```js
var client = new WebTorrent()
var magnetURI = '...'

client.add(magnetURI, function (torrent) {
  // create HTTP server for this torrent
  var server = torrent.createServer()
  server.listen(port) // start the server listening to a port

  // visit http://localhost:<port>/ to see a list of files

  // access individual files at http://localhost:<port>/<index> where index is the index
  // in the torrent.files array

  // later, cleanup...
  server.close()
  client.destroy()
})
```

#### `torrent.pause()`

Temporarily stop connecting to new peers. Note that this does not pause new incoming
connections, nor does it pause the streams of existing connections or their wires.

#### `torrent.resume()`

Resume connecting to new peers.

#### `torrent.on('done', function () {})`

Emitted when all the torrent's files have been downloaded

Here is a usage example:

```js
torrent.on('done', function(){
  console.log('torrent finished downloading');
  torrent.files.forEach(function(file){
     // do something with file
  })
})
```

#### `torrent.on('download', function (chunkSize) {})`

Emitted every time a new chunk of data arrives, it's useful for reporting the current torrent status, for instance:

```js
torrent.on('download', function(chunkSize){
  console.log('chunk size: ' + chunkSize);
  console.log('total downloaded: ' + torrent.downloaded);
  console.log('download speed: ' + torrent.downloadSpeed);
  console.log('progress: ' + torrent.progress);
  console.log('======');
})
```

#### `torrent.on('wire', function (wire) {})`

Emitted whenever a new peer is connected for this torrent. `wire` is an instance of
[`bittorrent-protocol`](https://github.com/feross/bittorrent-protocol), which is a
node.js-style duplex stream to the remote peer. This event can be used to specify
[custom BitTorrent protocol extensions](https://github.com/feross/bittorrent-protocol#extension-api).

Here is a usage example:

```js
var MyExtension = require('./my-extension')

torrent1.on('wire', function (wire, addr) {
  console.log('connected to peer with address ' + addr)
  wire.use(MyExtension)
})
```

See the `bittorrent-protocol`
[extension api docs](https://github.com/feross/bittorrent-protocol#extension-api) for more
information on how to define a protocol extension.

### file api

#### `file.name`

File name, as specified by the torrent. *Example: 'some-filename.txt'*

#### `file.path`

File path, as specified by the torrent. *Example: 'some-folder/some-filename.txt'*

#### `file.length`

File length (in bytes), as specified by the torrent. *Example: 12345*

#### `file.select()`

Selects the file to be downloaded, but at a lower priority than files with streams.
Useful if you know you need the file at a later stage.

#### `file.deselect()`

Deselects the file, which means it won't be downloaded unless someone creates a stream
for it.

#### `stream = file.createReadStream([opts])`

Create a [readable stream](http://nodejs.org/api/stream.html#stream_class_stream_readable)
to the file. Pieces needed by the stream will be prioritized highly and fetched from the
swarm first.

You can pass `opts` to stream only a slice of a file.

``` js
{
  start: startByte,
  end: endByte
}
```

Both `start` and `end` are inclusive.

#### `file.getBuffer(function callback (err, buffer) {})`

Get the file contents as a `Buffer`.

The file will be fetched from the network with highest priority, and `callback` will be
called once the file is ready. `callback` must be specified, and will be called with a an
`Error` (or `null`) and the file contents as a `Buffer`.

```js
file.getBuffer(function (err, buffer) {
  if (err) throw err
  console.log(buffer) // <Buffer 00 98 00 01 01 00 00 00 50 ae 07 04 01 00 00 00 0a 00 00 00 00 00 00 00 78 ae 07 04 01 00 00 00 05 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ...>
})
```

#### `file.appendTo(rootElem, function callback (err, elem) {})`

Show the file in a the browser by appending it to the DOM. This is a powerful function
that handles many file types like video (.mp4, .webm, .m4v, etc.), audio (.m4a, .mp3,
.wav, etc.), images (.jpg, .gif, .png, etc.), and other file formats (.pdf, .md, .txt,
etc.).

The file will be fetched from the network with highest priority and streamed into the
page (if it's video or audio). In some cases, video or audio files will not be streamable
because they're not in a format that the browser can stream so the file will be fully downloaded before being played. For other non-streamable file types like images and PDFs,
the file will be downloaded then displayed.

`rootElem` is a container element (CSS selector or reference to DOM node) that the content
will be shown in. A new DOM node will be created for the content and appended to
`rootElem`.

`callback` will be called once the file is visible to the user. `callback` must be
specified, and will be called with a an `Error` (or `null`) and the new DOM node that is
displaying the content.

```js
file.appendTo('#containerElement', function (err, elem) {
  if (err) throw err // file failed to download or display in the DOM
  console.log('New DOM node with the content', elem)
})
```

#### `file.renderTo(elem, function callback (err, elem) {})`

Like `file.appendTo` but renders directly into given element (or CSS selector).

#### `file.getBlobURL(function callback (err, url) {})`

Get a url which can be used in the browser to refer to the file.

The file will be fetched from the network with highest priority, and `callback` will be
called once the file is ready. `callback` must be specified, and will be called with a an
`Error` (or `null`) and the Blob URL (`String`).

```js
file.getBlobURL(function (err, url) {
  if (err) throw err
  var a = document.createElement('a')
  a.download = file.name
  a.href = url
  a.textContent = 'Download ' + file.name
  document.body.appendChild(a)
})
```

### Modules

Most of the active development is happening inside of small npm modules which are used by WebTorrent.

#### The Node Way&trade;

> "When applications are done well, they are just the really application-specific, brackish residue that can't be so easily abstracted away. All the nice, reusable components sublimate away onto github and npm where everybody can collaborate to advance the commons." — substack from ["how I write modules"](http://substack.net/how_I_write_modules)

![node.js is shiny](https://feross.net/x/node2.gif)

#### Modules

These are the main modules that make up WebTorrent:

| module | tests | version | description |
|---|---|---|---|
| **[webtorrent][webtorrent]** | [![][webtorrent-ti]][webtorrent-tu] | [![][webtorrent-ni]][webtorrent-nu] | **torrent client (this module)**
| [bittorrent-dht][bittorrent-dht] | [![][bittorrent-dht-ti]][bittorrent-dht-tu] | [![][bittorrent-dht-ni]][bittorrent-dht-nu] | distributed hash table client
| [bittorrent-peerid][bittorrent-peerid] | [![][bittorrent-peerid-ti]][bittorrent-peerid-tu] | [![][bittorrent-peerid-ni]][bittorrent-peerid-nu] | identify client name/version
| [bittorrent-protocol][bittorrent-protocol] | [![][bittorrent-protocol-ti]][bittorrent-protocol-tu] | [![][bittorrent-protocol-ni]][bittorrent-protocol-nu] | bittorrent protocol stream
| [bittorrent-swarm][bittorrent-swarm] | [![][bittorrent-swarm-ti]][bittorrent-swarm-tu] | [![][bittorrent-swarm-ni]][bittorrent-swarm-nu] | bittorrent connection manager
| [bittorrent-tracker][bittorrent-tracker] | [![][bittorrent-tracker-ti]][bittorrent-tracker-tu] | [![][bittorrent-tracker-ni]][bittorrent-tracker-nu] | bittorrent tracker server/client
| [create-torrent][create-torrent] | [![][create-torrent-ti]][create-torrent-tu] | [![][create-torrent-ni]][create-torrent-nu] | create .torrent files
| [magnet-uri][magnet-uri] | [![][magnet-uri-ti]][magnet-uri-tu] | [![][magnet-uri-ni]][magnet-uri-nu] | parse magnet uris
| [parse-torrent][parse-torrent] | [![][parse-torrent-ti]][parse-torrent-tu] | [![][parse-torrent-ni]][parse-torrent-nu] | parse torrent identifiers
| [torrent-discovery][torrent-discovery] | [![][torrent-discovery-ti]][torrent-discovery-tu] | [![][torrent-discovery-ni]][torrent-discovery-nu] | find peers via dht and tracker
| [ut_metadata][ut_metadata] | [![][ut_metadata-ti]][ut_metadata-tu] | [![][ut_metadata-ni]][ut_metadata-nu] | metadata for magnet uris **(ext)**
| [ut_pex][ut_pex] | [![][ut_pex-ti]][ut_pex-tu] | [![][ut_pex-ni]][ut_pex-nu] | peer discovery **(ext)**

[webtorrent]: https://github.com/feross/webtorrent
[webtorrent-ti]: https://img.shields.io/travis/feross/webtorrent/master.svg
[webtorrent-tu]: https://travis-ci.org/feross/webtorrent
[webtorrent-ni]: https://img.shields.io/npm/v/webtorrent.svg
[webtorrent-nu]: https://npmjs.org/package/webtorrent
[webtorrent-downloads-image]: https://img.shields.io/npm/dm/webtorrent.svg
[webtorrent-downloads-url]: https://npmjs.org/package/webtorrent
[webtorrent-gratipay-image]: https://img.shields.io/gratipay/feross.svg
[webtorrent-gratipay-url]: https://gratipay.com/feross/
[webtorrent-sauce-image]: https://saucelabs.com/browser-matrix/webtorrent.svg
[webtorrent-sauce-url]: https://saucelabs.com/u/webtorrent
[webtorrent-gitter-image]: https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg
[webtorrent-gitter-url]: https://gitter.im/feross/webtorrent

[bittorrent-dht]: https://github.com/feross/bittorrent-dht
[bittorrent-dht-ti]: https://img.shields.io/travis/feross/bittorrent-dht/master.svg
[bittorrent-dht-tu]: https://travis-ci.org/feross/bittorrent-dht
[bittorrent-dht-ni]: https://img.shields.io/npm/v/bittorrent-dht.svg
[bittorrent-dht-nu]: https://npmjs.org/package/bittorrent-dht

[bittorrent-peerid]: https://github.com/fisch0920/bittorrent-peerid
[bittorrent-peerid-ti]: https://img.shields.io/travis/fisch0920/bittorrent-peerid.svg
[bittorrent-peerid-tu]: https://travis-ci.org/fisch0920/bittorrent-peerid
[bittorrent-peerid-ni]: https://img.shields.io/npm/v/bittorrent-peerid.svg
[bittorrent-peerid-nu]: https://npmjs.org/package/bittorrent-peerid

[bittorrent-protocol]: https://github.com/feross/bittorrent-protocol
[bittorrent-protocol-ti]: https://img.shields.io/travis/feross/bittorrent-protocol/master.svg
[bittorrent-protocol-tu]: https://travis-ci.org/feross/bittorrent-protocol
[bittorrent-protocol-ni]: https://img.shields.io/npm/v/bittorrent-protocol.svg
[bittorrent-protocol-nu]: https://npmjs.org/package/bittorrent-protocol

[bittorrent-swarm]: https://github.com/feross/bittorrent-swarm
[bittorrent-swarm-ti]: https://img.shields.io/travis/feross/bittorrent-swarm/master.svg
[bittorrent-swarm-tu]: https://travis-ci.org/feross/bittorrent-swarm
[bittorrent-swarm-ni]: https://img.shields.io/npm/v/bittorrent-swarm.svg
[bittorrent-swarm-nu]: https://npmjs.org/package/bittorrent-swarm

[bittorrent-tracker]: https://github.com/feross/bittorrent-tracker
[bittorrent-tracker-ti]: https://img.shields.io/travis/feross/bittorrent-tracker/master.svg
[bittorrent-tracker-tu]: https://travis-ci.org/feross/bittorrent-tracker
[bittorrent-tracker-ni]: https://img.shields.io/npm/v/bittorrent-tracker.svg
[bittorrent-tracker-nu]: https://npmjs.org/package/bittorrent-tracker

[create-torrent]: https://github.com/feross/create-torrent
[create-torrent-ti]: https://img.shields.io/travis/feross/create-torrent/master.svg
[create-torrent-tu]: https://travis-ci.org/feross/create-torrent
[create-torrent-ni]: https://img.shields.io/npm/v/create-torrent.svg
[create-torrent-nu]: https://npmjs.org/package/create-torrent

[magnet-uri]: https://github.com/feross/magnet-uri
[magnet-uri-ti]: https://img.shields.io/travis/feross/magnet-uri/master.svg
[magnet-uri-tu]: https://travis-ci.org/feross/magnet-uri
[magnet-uri-ni]: https://img.shields.io/npm/v/magnet-uri.svg
[magnet-uri-nu]: https://npmjs.org/package/magnet-uri

[parse-torrent]: https://github.com/feross/parse-torrent
[parse-torrent-ti]: https://img.shields.io/travis/feross/parse-torrent/master.svg
[parse-torrent-tu]: https://travis-ci.org/feross/parse-torrent
[parse-torrent-ni]: https://img.shields.io/npm/v/parse-torrent.svg
[parse-torrent-nu]: https://npmjs.org/package/parse-torrent

[torrent-discovery]: https://github.com/feross/torrent-discovery
[torrent-discovery-ti]: https://img.shields.io/travis/feross/torrent-discovery/master.svg
[torrent-discovery-tu]: https://travis-ci.org/feross/torrent-discovery
[torrent-discovery-ni]: https://img.shields.io/npm/v/torrent-discovery.svg
[torrent-discovery-nu]: https://npmjs.org/package/torrent-discovery

[ut_metadata]: https://github.com/feross/ut_metadata
[ut_metadata-ti]: https://img.shields.io/travis/feross/ut_metadata/master.svg
[ut_metadata-tu]: https://travis-ci.org/feross/ut_metadata
[ut_metadata-ni]: https://img.shields.io/npm/v/ut_metadata.svg
[ut_metadata-nu]: https://npmjs.org/package/ut_metadata

[ut_pex]: https://github.com/fisch0920/ut_pex
[ut_pex-ti]: https://img.shields.io/travis/fisch0920/ut_pex.svg
[ut_pex-tu]: https://travis-ci.org/fisch0920/ut_pex
[ut_pex-ni]: https://img.shields.io/npm/v/ut_pex.svg
[ut_pex-nu]: https://npmjs.org/package/ut_pex

### Contribute

WebTorrent is an **[OPEN Open Source Project](https://github.com/feross/webtorrent/blob/master/CONTRIBUTING.md)**. Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit.

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
<tr><th align="left">James Halliday</th><td><a href="https://github.com/substack">GitHub/substack</a></td><td><a href="http://twitter.com/substack">Twitter/@substack</a></td></tr>
<tr><th align="left">Gilles De Mey</th><td><a href="https://github.com/gillesdemey">GitHub/gillesdemey</a></td><td><a href="http://twitter.com/gdemey">Twitter/@gdemey</a></td></tr>
<tr><th align="left">Valérian Galliat</th><td><a href="https://github.com/valeriangalliat">GitHub/valeriangalliat</a></td><td><a href="http://twitter.com/valeriangalliat">Twitter/@valeriangalliat</a></td></tr>
<tr><th align="left">Joseph Frazier</th><td><a href="https://github.com/josephfrazier">GitHub/josephfrazier</a></td><td></td></tr>
<tr><th align="left">Lucas Pelegrino</th><td><a href="https://github.com/lucaswxp">GitHub/lucaswxp</a></td><td><a href="http://twitter.com/lucaswxp">Twitter/@lucaswxp</a></td></tr>
<tr><th align="left">Diego Rodríguez B.</th><td><a href="https://github.com/DiegoRBaquero">GitHub/DiegoRBaquero</a></td><td><a href="http://twitter.com/DiegoRBaquero">Twitter/@DiegoRBaquero</a></td></tr>
</tbody></table>

#### Enable debug logs

In **node**, enable debug logs by setting the `DEBUG` environment variable to the name of the
module you want to debug (e.g. `bittorrent-protocol`, or `*` to print **all logs**).

```bash
DEBUG=* webtorrent
```

Of course, this also works for the development version:

```bash
DEBUG=* ./bin/cmd.js
```

In the **browser**, enable debug logs by running this in the developer console:

```js
localStorage.debug = '*'
```

Disable by running this:

```js
localStorage.removeItem('debug')
```

### Talks about WebTorrent

- May 2015 (Data Terra Nemo) - [WebTorrent: Mother of all demos](https://www.youtube.com/watch?v=RRtNEcAaUO8)
- Nov 2014 (JSConf Asia) - [How WebTorrent Works](https://www.youtube.com/watch?v=kxHRATfvnlw)
- Sep 2014 (NodeConf EU) – [WebTorrent Mad Science](https://www.youtube.com/watch?v=BVBXkzVjvPc) (first working WebTorrent demo)
- May 2014 (JS.LA) – [How I Built a BitTorrent Client in the Browser](https://vimeo.com/97324247) (progress update; node client working)
- Oct 2013 (RealtimeConf) – [WebRTC Black Magic](https://vimeo.com/77265280) (first mention of idea for WebTorrent)

### License

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).

![Magic](https://webtorrent.io/img/logo.png)
