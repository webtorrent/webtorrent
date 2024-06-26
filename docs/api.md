# WebTorrent Documentation

WebTorrent is a streaming torrent client for **Node.js** and the **web**. WebTorrent
provides the same API in both environments.

To use WebTorrent in the browser, [WebRTC] support is required (Chrome, Firefox, Opera, Safari).

[webrtc]: https://en.wikipedia.org/wiki/WebRTC

## Install

```bash
npm install webtorrent
```

## Quick Example

```js
const client = new WebTorrent()

const torrentId = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent'

// see tutorials.md for a full example of streaming media using service workers
navigator.serviceWorker.register('sw.min.js')
const controller = await navigator.serviceWorker.ready
client.createServer({ controller })

client.add(torrentId, torrent => {
  // Torrents can contain many files. Let's use the .mp4 file
  const file = torrent.files.find(file => {
    return file.name.endsWith('.mp4')
  })

  // Display the file by adding it to the DOM. Supports video, audio, image, etc. files
  file.streamTo(document.querySelector('video'))
})
```

# WebTorrent API

## `WebTorrent.WEBRTC_SUPPORT`

Is WebRTC natively supported in the environment?

```js
if (WebTorrent.WEBRTC_SUPPORT) {
  // WebRTC is supported
} else {
  // Use a fallback
}
```

## `client = new WebTorrent([opts])`

Create a new `WebTorrent` instance.

If `opts` is specified, then the default options (shown below) will be overridden.

```js
{
  maxConns: Number,        // Max number of connections per torrent (default=55)
  nodeId: String|Uint8Array,   // DHT protocol node ID (default=randomly generated)
  peerId: String|Uint8Array,   // Wire protocol peer ID (default=randomly generated)
  tracker: Boolean|Object, // Enable trackers (default=true), or options object for Tracker
  dht: Boolean|Object,     // Enable DHT (default=true), or options object for DHT
  lsd: Boolean,            // Enable BEP14 local service discovery (default=true)
  utPex: Boolean,          // Enable BEP11 Peer Exchange (default=true)
  natUpnp: Boolean | String, // Enable NAT port mapping via NAT-UPnP (default=true). NodeJS only
  natPmp: Boolean,         // Enable NAT port mapping via NAT-PMP (default=true). NodeJS only.
  webSeeds: Boolean,       // Enable BEP19 web seeds (default=true)
  utp: Boolean,            // Enable BEP29 uTorrent transport protocol (default=true)
  seedOutgoingConnections: Boolean // Enable outgoing connections when seeding (default=true)
  blocklist: Array|String, // List of IP's to block
  downloadLimit: Number,   // Max download speed (bytes/sec) over all torrents (default=-1)
  uploadLimit: Number,     // Max upload speed (bytes/sec) over all torrents (default=-1)
}
```

For possible values of `opts.dht` see the
[`bittorrent-dht` documentation](https://github.com/webtorrent/bittorrent-dht#dht--new-dhtopts).

For possible values of `opts.tracker` see the
[`bittorrent-tracker` documentation](https://github.com/webtorrent/bittorrent-tracker#client).

For possible values of `opts.blocklist` see the
[`load-ip-set` documentation](https://github.com/webtorrent/load-ip-set#usage).

For `opts.natUpnp` and `opts.natPmp`, if both are set to `true`, PMP will be attempted first, then fallback to UPNP. NodeJS only.

For `opts.natUpnp`, if set to `true`, a temporary mapping is used, if set to `permanent`, a permanent TTL will be used for UPNP if the router only supports permanent leases. NodeJS only.

For `opts.seedOutgoingConnections`, if set `true`, outgoing connections will be established while seeding, otherwise, only inbound connections will be responded to.

For `downloadLimit` and `uploadLimit` the possible values can be:
  - `> 0`. The client will set the throttle at that speed
  - `0`. The client will block any data from being downloaded or uploaded
  - `-1`. The client will is disable the throttling and use the whole bandwidth available

## `client.add(torrentId, [opts], [function ontorrent (torrent) {}])`

Start downloading a new torrent.

`torrentId` can be one of:

- magnet uri (string)
- torrent file (Uint8Array)
- info hash (hex string or Uint8Array)
- parsed torrent (from [parse-torrent](https://github.com/webtorrent/parse-torrent))
- http/https url to a torrent file (string)
- filesystem path to a torrent file (string) *(Node.js only)*

If `opts` is specified, then the default options (shown below) will be overridden.

```js
{
  announce: [String],        // Torrent trackers to use (added to list in .torrent or magnet uri)
  getAnnounceOpts: Function, // Custom callback to allow sending extra parameters to the tracker
  urlList: [String],         // Array of web seeds
  maxWebConns: Number,       // Max number of simultaneous connections per web seed [default=4]
  path: String,              // Folder to download files to (default=`/tmp/webtorrent/`)
  private: Boolean,          // If true, client will not share the hash with the DHT nor with PEX (default is the privacy of the parsed torrent)
  store: Function,           // Custom chunk store (must follow [abstract-chunk-store](https://www.npmjs.com/package/abstract-chunk-store) API)
  destroyStoreOnDestroy: Boolean, // If truthy, client will delete the torrent's chunk store (e.g. files on disk) when the torrent is destroyed
  storeCacheSlots: Number,   // Number of chunk store entries (torrent pieces) to cache in memory [default=20]; 0 to disable caching
  storeOpts: Object,         // Custom options passed to the store
  addUID: Boolean,           // (Node.js only) If true, the torrent will be stored in it's infoHash folder to prevent file name collisions (default=false)
  skipVerify: Boolean,       // If true, client will skip verification of pieces for existing store and assume it's correct
  preloadedStore: Function,  // Custom, pre-loaded chunk store (must follow [abstract-chunk-store](https://www.npmjs.com/package/abstract-chunk-store) API)
  strategy: String,          // Piece selection strategy, `rarest` or `sequential`(defaut=`sequential`)
  noPeersIntervalTime: Number, // The amount of time (in seconds) to wait between each check of the `noPeers` event (default=30)
  paused: Boolean,           // If true, create the torrent in a paused state (default=false)
  deselect: Boolean,         // If true, create the torrent with no pieces selected (default=false)
  alwaysChokeSeeders: Boolean // If true, client will automatically choke seeders if it's seeding. (default=true)
}
```

If `ontorrent` is specified, then it will be called when **this** torrent is ready to be
used (i.e. metadata is available). Note: this is distinct from the 'torrent' event which
will fire for **all** torrents.

If you want access to the torrent object immediately in order to listen to events as the
metadata is fetched from the network, then use the return value of `client.add`. If you
just want the file data, then use `ontorrent` or the 'torrent' event.

If you provide `opts.store`, it will be called as
`opts.store(chunkLength, storeOpts)` with:

* `storeOpts` - custom `storeOpts` specified in `opts`
* `storeOpts.length` - size of all the files in the torrent
* `storeOpts.files` - an array of torrent file objects
* `storeOpts.torrent` - the torrent instance being stored
* `storeOpts.path` - path to the store, based on `opts.path`
* `storeOpts.name` - the info hash of the torrent instance being stored
* `storeOpts.addUID` - boolean which tells the store if it should include an UID in it's file paths
* `storeOpts.rootDir` - *(browser only)* [FileSystemDirectoryHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle) - if supported by the browser, allows the user to specify a custom directory to stores the files in, retaining the torrent's folder and file structure

**Note (browser only):** If you don't want to retain data across sessions, make sure to manually destroy the torrent store when the page closes (More on how below). This has to happen on the `beforeunload` event at latest, in order for the data to be removed. [About page lifecycles.](https://developers.google.com/web/updates/2018/07/page-lifecycle-api)

**Note:** Downloading a torrent automatically seeds it, making it available for download by other peers.

## `client.seed(input, [opts], [function onseed (torrent) {}])`

Start seeding a new torrent.

`input` can be any of the following:

- filesystem path to file or folder
 (string) *(Node.js only)*
- W3C [FileList](https://developer.mozilla.org/en-US/docs/Web/API/FileList) object (basically an array of `File` objects) *(browser only)*
- W3C [File](https://developer.mozilla.org/en-US/docs/Web/API/File)/[Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob) object (from an `<input>` or drag and drop)
- typed array or array of numbers
- Node [Buffer](https://nodejs.org/api/buffer.html) object
- Node [Readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable) object

Or, an **array of of any of those values**.

If `opts` is specified, it should contain the following types of options:

- options for [create-torrent](https://github.com/webtorrent/create-torrent#createtorrentinput-opts-function-callback-err-torrent-) (to allow configuration of the .torrent file that is created)
- options for `client.add` (see above)

If `onseed` is specified, it will be called when the client has begun seeding the file.

**Note:** Every torrent is required to have a name. If one is not explicitly provided
through `opts.name`, one will be determined automatically using the following logic:

- If all files share a common path prefix, that will be used. For example, if all file
  paths start with `/imgs/` the torrent name will be `imgs`.
- Otherwise, the first file that has a name will determine the torrent name. For example,
  if the first file is `/foo/bar/baz.txt`, the torrent name will be `baz.txt`.
- If no files have names (say that all files are Uint8Array or Stream objects), then a name
  like "Unnamed Torrent <id>" will be generated.

**Note:** Every file is required to have a name. For filesystem paths or W3C File objects,
the name is included in the object. For Uint8Array or Readable stream types, a `name` property
can be set on the object, like this:

```js
const buf = new Uint8Array('Some file content')
buf.name = 'Some file name'
client.seed(buf, cb)
```

## `client.on('add', function (torrent) {})`

Emitted when a torrent is added to client.torrents. This allows attaching to torrent events that may be emitted before the client 'torrent' event is emitted. See the torrent section for more info on what methods a `torrent` has.

## `client.on('remove', function (torrent) {})`

Emitted when a torrent is removed from client.torrents. See the torrent section for more info on what methods a `torrent` has.

## `client.on('torrent', function (torrent) {})`

Emitted when a torrent is ready to be used (i.e. metadata is available and store is
ready). See the torrent section for more info on what methods a `torrent` has.

## `client.on('error', function (err) {})`

Emitted when the client encounters a fatal error. The client is automatically
destroyed and all torrents are removed and cleaned up when this occurs.

Always listen for the 'error' event.

## `await client.remove(torrentId, [opts], [function callback (err) {}])`

Remove a torrent from the client. Destroy all connections to peers and delete all saved file metadata.

If `opts.destroyStore` is specified, it will override `opts.destroyStoreOnDestroy` passed when the torrent was added.
If truthy, `store.destroy()` will be called, which will delete the torrent's files from the disk.

If `callback` is provided, it will be called when the torrent is fully destroyed,
i.e. all open sockets are closed, and the storage is either closed or destroyed.

## `client.destroy([function callback (err) {}])`

Destroy the client, including all torrents and connections to peers. If `callback` is specified, it will be called when the client has gracefully closed.

## `client.torrents[...]`

An array of all torrents in the client.

## `await client.get(torrentId)`

Returns a promise which resolves the torrent with the given `torrentId`. Convenience method. Easier than searching
through the `client.torrents` array. Returns `null` if no matching torrent found.

## `client.downloadSpeed`

Total download speed for all torrents, in bytes/sec.

## `client.uploadSpeed`

Total upload speed for all torrents, in bytes/sec.

## `client.progress`

Total download progress for all **active** torrents, from 0 to 1.

## `client.ratio`

Aggregate "seed ratio" for all torrents (uploaded / downloaded).

## `client.throttleDownload(rate)`

Sets the maximum speed at which the client downloads the torrents, in bytes/sec.

`rate` must be bigger or equal than zero, or `-1` to disable the download throttle and
use the whole bandwidth of the connection.

## `client.throttleUpload(rate)`

Sets the maximum speed at which the client uploads the torrents, in bytes/sec.

`rate` must be bigger or equal than zero, or `-1` to disable the upload throttle and
use the whole bandwidth of the connection.


## `client.createServer([opts], force)`

Create an http server to serve the contents of this torrent, dynamically fetching the needed torrent pieces to satisfy http requests. Range requests are supported.
If `opts` is specified, it can have the following properties:
```js
{
  origin: String // Allow requests from specific origin. `false` for same-origin. [default: '*']
  hostname: String // If specified, only allow requests whose `Host` header matches this hostname. Note that you should not specify the port since this is automatically determined by the server. Ex: `localhost` [default: `undefined`]. NodeJS only.
  path: String // Allows to overwrite the default `/webtorrent` base path. [default: '/webtorrent']. NodeJS only.
  controller: ServiceWorkerRegistration // Accepts an existing service worker registration [await navigator.serviceWorker.getRegistration()]. Browser only. Required!
}
```

If `force` is specified, it can force WebTorrent to use a specific implementation for enviorments which run both Node and Browser like NW.js or Electron. Allowed values:
```js
'browser' || 'node'
```

Visiting the root of the server `/` won't show anything. Visiting `/webtorrent/` will list all torrents. Access individual torrents at `/webtorrent/<infohash>` where `infohash` is the hash of the torrent. To acceess individual files, go to `/webtorrent/<infoHash>/<filepath>` where filepath is the file's path in the torrent.


Here is a usage example for Node.js:

```js
const client = new WebTorrent()
const magnetURI = 'magnet: ...'

const instance = client.createServer()
instance.server.listen(0) // start the server listening to a port
// 0 automatically finds an open port instead of forcing a potentially used one
client.add(magnetURI, torrent => {
  // create HTTP server for this torrent

  const url = torrent.files[0].streamURL
  console.log(url)
  // visit http://localhost:<port>/webtorrent/ to see a list of torrents

  // access individual torrents at http://localhost:<port>/webtorrent/<infoHash> where infoHash is the hash of the torrent
})

// later, cleanup...
instance.close()
client.destroy()
```

In browser needs either [this worker](https://github.com/webtorrent/webtorrent/blob/master/sw.min.js) to be used, or have [this functionality](https://github.com/webtorrent/webtorrent/blob/master/lib/worker.js) implemented.

Here is a user example for browser:

```js
const client = new WebTorrent()
const magnetURI = 'magnet: ...'
const player = document.querySelector('video')

function download (instance) {
  client.add(magnetURI, torrent => {
    const url = torrent.files[0].streamURL
    console.log(url)
    // visit <origin>/webtorrent/ to see a list of torrents, where origin is the worker registration scope.

    // access individual torrents at /webtorrent/<infoHash> where infoHash is the hash of the torrent
  })
}
navigator.serviceWorker.register('./sw.min.js', { scope: './' }).then(reg => {
  const worker = reg.active || reg.waiting || reg.installing
  function checkState (worker) {
    return worker.state === 'activated' && download(client.createServer({ controller: reg }))
  }
  if (!checkState(worker)) {
    worker.addEventListener('statechange', ({ target }) => checkState(target))
  }
})

// later, cleanup...
client._server.close()
client.destroy()
```
Needs either [this worker](https://github.com/webtorrent/webtorrent/blob/master/sw.min.js) to be used, or have [this functionality](https://github.com/webtorrent/webtorrent/blob/master/lib/worker.js) implemented.

# Torrent API

## `torrent.name`

Name of the torrent (string).

## `torrent.infoHash`

Info hash of the torrent (string).

## `torrent.magnetURI`

Magnet URI of the torrent (string).

## `torrent.torrentFile`

`.torrent` file of the torrent (Uint8Array).

## `torrent.torrentFileBlob`

`.torrent` file of the torrent (Blob). Useful for creating Blob URLs via `URL.createObjectURL(blob)`

## `torrent.announce[...]`

Array of all tracker servers. Each announce is an URL (string).

## `torrent.files[...]`

Array of all files in the torrent. See documentation for `File` below to learn what
methods/properties files have.

## `torrent.pieces[...]`

Array of all pieces in the torrent. See documentation for `Piece` below to learn what
properties pieces have. Some pieces can be null.

## `torrent.pieceLength`

Length in bytes of every piece but the last one.

## `torrent.lastPieceLength`

Length in bytes of the last piece (<= of `torrent.pieceLength`).

## `torrent.timeRemaining`

Time remaining for download to complete (in milliseconds).

## `torrent.received`

Total bytes received from peers (*including* invalid data).

## `torrent.downloaded`

Total *verified* bytes received from peers.

## `torrent.uploaded`

Total bytes uploaded to peers.

## `torrent.downloadSpeed`

Torrent download speed, in bytes/sec.

## `torrent.uploadSpeed`

Torrent upload speed, in bytes/sec.

## `torrent.progress`

Torrent download progress, from 0 to 1.

## `torrent.ratio`

Torrent "seed ratio" (uploaded / downloaded).

## `torrent.numPeers`

Number of peers in the torrent swarm.

## `torrent.maxWebConns`

Max number of simultaneous connections per web seed, as passed in the options.

## `torrent.path`

Torrent download location.

## `torrent.ready`

True when the torrent is ready to be used (i.e. metadata is available and store is
ready).

## `torrent.paused`

True when the torrent has stopped connecting to new peers. Note that this does
not pause new incoming connections, nor does it pause the streams of existing
connections or their wires.

## `torrent.done`

True when all the torrent files have been downloaded.

## `torrent.length`

Sum of the files length (in bytes).

## `torrent.created`

Date of creation of the torrent (as a [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) object).

## `torrent.createdBy`

Author of the torrent (string).

## `torrent.comment`

A comment optionnaly set by the author (string).

## `torrent.destroy([opts], [callback])`

Remove the torrent from its client. Destroy all connections to peers and delete all saved file metadata.

If `opts.destroyStore` is specified, it will override `opts.destroyStoreOnDestroy` passed when the torrent was added.
If truthy, `store.destroy()` will be called, which will delete the torrent's files from the disk.

If `callback` is provided, it will be called when the torrent is fully destroyed,
i.e. all open sockets are closed, and the storage is either closed or destroyed.

## `torrent.addPeer(peer)`

Add a peer to the torrent swarm. This is advanced functionality. Normally, you should not
need to call `torrent.addPeer()` manually. WebTorrent will automatically find peers using
the tracker servers or DHT. This is just for manually adding a peer to the client.

This method should not be called until the `infoHash` event has been emitted.

Returns `true` if peer was added, `false` if peer was blocked by the loaded blocklist.

The `peer` argument must be an address string in the format `12.34.56.78:4444` (for
normal TCP/uTP peers), or a [`simple-peer`](https://github.com/feross/simple-peer)
instance (for WebRTC peers).

## `torrent.addWebSeed(urlOrConn)`

Add a web seed to the torrent swarm. For more information on BitTorrent web seeds, see
[BEP19](http://www.bittorrent.org/beps/bep_0019.html).

In the browser, web seed servers must have proper CORS (Cross-origin resource sharing)
headers so that data can be fetched across domain.

The `urlOrConn` argument is either the web seed URL, or an object that provides a custom
web seed implementation. A custom conn object is a duplex stream that speaks the bittorrent
wire protocol and pretends to be a remote peer. It must have a `connId` property that
uniquely identifies the custom web seed.

## `torrent.removePeer(peer)`

Remove a peer from the torrent swarm. This is advanced functionality. Normally, you should
not need to call `torrent.removePeer()` manually. WebTorrent will automatically remove
peers from the torrent swarm when they're slow or don't have pieces that are needed.

The `peer` argument should be an address (i.e. "ip:port" string), a peer id (hex string),
or `simple-peer` instance.

## `torrent.select(start, end, [priority], [notify])`

Selects a range of pieces to prioritize starting with `start` and ending with `end` (both
inclusive) at the given `priority`. `notify` is an optional callback to be called when the
selection is updated with new data.

## `torrent.deselect(start, end)`

Deprioritizes a range of previously selected pieces.

## `torrent.critical(start, end)`

Marks a range of pieces as critical priority to be downloaded ASAP. From `start` to `end`
(both inclusive).


## `torrent.pause()`

Temporarily stop connecting to new peers. Note that this does not pause new incoming
connections, nor does it pause the streams of existing connections or their wires.

## `torrent.resume()`

Resume connecting to new peers.

## `torrent.rescanFiles([function callback (err) {}])`

Verify the hashes of all pieces in the store and update the bitfield for any new valid
pieces. Useful if data has been added to the store outside WebTorrent, e.g. if another
process puts a valid file in the right place. Once the scan is complete,
`callback(null)` will be called (if provided), unless the torrent was destroyed during
the scan, in which case `callback` will be called with an error.

## `torrent.on('infoHash', function () {})`

Emitted when the info hash of the torrent has been determined.

## `torrent.on('metadata', function () {})`

Emitted when the metadata of the torrent has been determined. This includes the full
contents of the .torrent file, including list of files, torrent length, piece hashes,
piece length, etc.

## `torrent.on('ready', function () {})`

Emitted when the torrent is ready to be used (i.e. metadata is available and store is
ready).

## `torrent.on('warning', function (err) {})`

Emitted when there is a warning. This is purely informational and it is not necessary to
listen to this event, but it may aid in debugging.

## `torrent.on('error', function (err) {})`

Emitted when the torrent encounters a fatal error. The torrent is automatically destroyed
and removed from the client when this occurs.

**Note:** Torrent errors are emitted at `torrent.on('error')`. If there are no
'error' event handlers on the torrent instance, then the error will be emitted at
`client.on('error')`. This prevents throwing an uncaught exception (unhandled
'error' event), but it makes it impossible to distinguish client errors versus
torrent errors. Torrent errors are not fatal, and the client is still usable
afterwards. Therefore, always listen for errors in both places
(`client.on('error')` and `torrent.on('error')`).

## `torrent.on('done', function () {})`

Emitted when all the torrent files have been downloaded.

Here is a usage example:

```js
torrent.on('done', () => {
  console.log('torrent finished downloading')
  for (const file of torrent.files) { 
    // do something with file
  }
})
```

## `torrent.on('download', function (bytes) {})`

Emitted whenever data is downloaded. Useful for reporting the current torrent status, for
instance:

```js
torrent.on('download', bytes => {
  console.log('just downloaded: ' + bytes)
  console.log('total downloaded: ' + torrent.downloaded)
  console.log('download speed: ' + torrent.downloadSpeed)
  console.log('progress: ' + torrent.progress)
})
```

## `torrent.on('upload', function (bytes) {})`

Emitted whenever data is uploaded. Useful for reporting the current torrent status.

## `torrent.on('wire', function (wire) {})`

Emitted whenever a new peer is connected for this torrent. `wire` is an instance of
[`bittorrent-protocol`](https://github.com/webtorrent/bittorrent-protocol), which is a
node.js-style duplex stream to the remote peer. This event can be used to specify
[custom BitTorrent protocol extensions](https://github.com/webtorrent/bittorrent-protocol#extension-api).

Here is a usage example:

```js
import MyExtension from './my-extension'

torrent1.on('wire', (wire, addr) => {
  console.log('connected to peer with address ' + addr)
  wire.use(MyExtension)
})
```

See the `bittorrent-protocol`
[extension api docs](https://github.com/webtorrent/bittorrent-protocol#extension-api) for more
information on how to define a protocol extension.

## `torrent.on('noPeers', function (announceType) {})`

Emitted every couple of seconds when no peers have been found. `announceType` is either `'tracker'`, `'dht'`, `'lsd'`, or `'ut_pex'` depending on which announce occurred to trigger this event. Note that if you're attempting to discover peers from a tracker, a DHT, a LSD, and PEX you'll see this event separately for each.

## `torrent.on('verified', function (index) {})`

Emitted every time a piece is verified, the value of the event is the index of the verified piece.

# File API

Webtorrent Files closely mimic W3C [Files](https://developer.mozilla.org/en-US/docs/Web/API/File)/[Blobs](https://developer.mozilla.org/en-US/docs/Web/API/Blob) except for `slice` where instead you pass the offsets as objects to the arrayBuffer/stream/createReadStream functions.

## `file.name`

File name, as specified by the torrent. *Example: 'some-filename.txt'*

## `file.path`

File path, as specified by the torrent. *Example: 'some-folder/some-filename.txt'*

## `file.length` or `file.size`

File length (in bytes), as specified by the torrent. *Example: 12345*

## `file.type`

Mime type of the file, falls back to `application/octet-stream` if the type is not recognized.

## `file.downloaded`

Total *verified* bytes received from peers, for this file.

## `file.progress`

File download progress, from 0 to 1.

## `file.select([priority])`

Selects the file to be downloaded, at the given `priority`.
Useful if you know you need the file at a later stage.

## `file.deselect()`

Deselects the file's specific priority, which means it won't be downloaded unless someone creates a stream for it.

*Note: This method is currently not working as expected, see [dcposch answer on #164](https://github.com/webtorrent/webtorrent/issues/164) for a nice work around solution.

## `stream = file.createReadStream([opts])`

Create a [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable)
to the file. Pieces needed by the stream will be prioritized highly and fetched from the
swarm first.

You can pass `opts` to stream only a slice of a file.

```js
{
  start: startByte,
  end: endByte
}
```

Both `start` and `end` are inclusive.

## `stream = file.stream(opts)`

Create a W3C [ReadableStream](https://devdocs.io/dom/readablestream)
to the file. Pieces needed by the stream will be prioritized highly and fetched from the
swarm first.

You can pass `opts` to stream only a slice of a file.

```js
{
  start: startByte,
  end: endByte
}
```

Both `start` and `end` are inclusive.

## `iterator = file[Symbol.asyncIterator]`

Create an [async iterator](https://devdocs.io/javascript/global_objects/symbol/asynciterator)
to the file. Pieces needed by the stream will be prioritized highly and fetched from the
swarm first.

You can pass `opts` to iterate only a slice of a file.

```js
{
  start: startByte,
  end: endByte
}
```

Both `start` and `end` are inclusive.

Example:

```js
for await (const chunk of file) {
  // do something with chunk
}
```

## `arrayBuffer = await file.arrayBuffer(opts)`

Get the file contents as a `ArrayBuffer`.

You can pass `opts` to get only a part of an ArrayBuffer.

```js
{
  start: startByte,
  end: endByte
}
```

```js
const data = await file.arrayBuffer()
console.log(data) // ArrayBuffer { [Uint8Contents]: <00 62 00 01>, byteLength: 4 }
```
## `blob = await file.blob(opts)`

Get a W3C `Blob` object which contains the file data.

Useful for creating Blob URLs via `URL.createObjectURL(blob)`.

You can pass `opts` to get only a part of an Blob.

```js
{
  start: startByte,
  end: endByte
}
```
## `file.streamTo(elem)` *(browser only)*

Requires `client.createServer` to be ran beforehand. Sets the element source to the file's streaming URL. Supports streaming, seeking and all browser codecs and containers.

Support table:
|Containers|Chromium|Mobile Chromium|Edge|Chrome|Firefox|
|-|:-:|:-:|:-:|:-:|:-:|
|3g2|✓|✓|✓|✓|✓|
|3gp|✓|✓|✓|✓|✘|
|avi|✘|✘|✘|✘|✘|
|m2ts|✘|✘|✓**|✘|✘|
|m4v etc.|✓*|✓*|✓*|✓*|✓*|
|mp4|✓|✓|✓|✓|✓|
|mpeg|✘|✘|✘|✘|✘|
|mov|✓|✓|✓|✓|✓|
|ogm ogv|✓|✓|✓|✓|✓|
|webm|✓|✓|✓|✓|✓|
|mkv|✓|✓|✓|✓|✘|

\* Container might be supported, but the container's codecs might not be.  
\*\* Documented as working, but can't reproduce.  

|Video Codecs|Chromium|Mobile Chromium|Edge|Chrome|Firefox|
|-|:-:|:-:|:-:|:-:|:-:|
|AV1|✓|✓|✓|✓|✓|
|H.263|✘|✘|✘|✘|✘|
|H.264|✓|✓|✓|✓|✓|
|H.265|✘|✘|✓*|✓|✘|
|MPEG-2/4|✘|✘|✘|✘|✘|
|Theora|✓|✘|✓|✓|✓|
|VP8/9|✓|✓|✓|✓|✓|

\* Requires MSStore extension which you can get by opening this link `ms-windows-store://pdp/?ProductId=9n4wgh0z6vhq` while using Edge.

|Audio Codecs|Chromium|Mobile Chromium|Edge|Chrome|Firefox|
|-|:-:|:-:|:-:|:-:|:-:|
|AAC|✓|✓|✓|✓|✓|
|AC3|✘|✘|✓|✘|✘|
|DTS|✘|✘|✘|✘|✘|
|EAC3|✘|✘|✓|✘|✘|
|FLAC|✓|✓*|✓|✓|✓|
|MP3|✓|✓|✓|✓|✓|
|Opus|✓|✓|✓|✓|✓|
|TrueHD|✘|✘|✘|✘|✘|
|Vorbis|✓|✓|✓|✓|✓*|

\* Might not work in some video containers.

Since container and codec support is browser dependent these values might change over time.
## `file.streamURL`

Requires `client.createServer` to be ran beforehand.

Returns the URL of the file which is recognized by the HTTP server.

This method is useful both for servers which run WebTorrent or client apps. A few examples:

```js
const url = file.streamURL

// create download link
if (err) throw err
const a = document.createElement('a')
a.target = "_blank"
a.href = url
a.textContent = 'Download ' + file.name
document.body.append(a)

// render an image on a canvas
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
const img = new Image()
const loaded = new Promise(resolve => img.onload = resolve)
img.src = url
await loaded
ctx.drawImage(img)

// send the file URL to another device on the network which can then display the file remotely [nodejs only]
import networkAddress from 'network-address'

const networkURL = `http://${networkAddress()}:${client._server.port}${url}`
sendRemote(networkURL)
```

## `file.on('stream', function ({ stream, file, req }, function pipeCallback) {})`

This is advanced functionality.

Emitted every time when the HTTP server creates a new read stream. For example every time the user seeks a video. This allows you to find out what parts of the file the browser is requesting, and how it's requesting them. Additionally it allows you to manipulate the data that's being streamed.

Yields an object with 3 values and a function:
- object - information about the request,
  - `stream` - a [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable) which the user can manipulate,
  - `file` - the file object that's being streamed,
  - `req` - all the request information which the browser made when requesting the data.
- function - if you pipe the `stream`, use this function to callback the piped stream **synchronously!** Otherwise the playback is likely to break.

Example usage:
```js
file.on('stream', ({ stream, file, req }, cb) => {
  if (req.destination === 'audio' && file.name.endsWith('.dts')) {
    const transcoder = new SomeAudioTranscoder()
    cb(transcoder)
    // do other things
  }
})
```

## `file.on('iterator', function ({ stream, file, req }, function transformCallback) {})`

This is advanced functionality.

Same as with the `stream` event this is emitted by the HTTP server when it creates an async iterator for the file's data. This is used for very low-level manipulation of the incoming data and they way it's generated for example you could potentially accelerate how fast and how much data is pulled from the torrent.

Yields an object with 3 values and a function:
- object - information about the request,
  - `iterator` - an [async iterator](https://devdocs.io/javascript/global_objects/symbol/asynciterator) which the user can manipulate,
  - `file` - the file object that's being streamed,
  - `req` - all the request information which the browser made when requesting the data.
- function - if you wish to transform the `iterator`, use this function to callback the transformed iterator **synchronously!** Otherwise the playback is likely to break.

Example usage:
```js
import par from 'it-parallel'

file.on('iterator', ({ iterator, file, req }, cb) => {
  const transform = par(iterator, { concurrency: 5, ordered: true })
  cb(transform)
})
```

## `file.includes(piece)`
Check if the piece number contains this file's data.

## `file.on('done', function () {})`

Emitted when the file has been downloaded.

# Piece API

## `piece.length`

Piece length (in bytes). *Example: 12345*

## `piece.missing`

Piece missing length (in bytes). *Example: 100*

# Wire API

## `wire.peerId`

Remote peer id (hex string)

## `wire.type`

Connection type ('webrtc', 'tcpIncoming', 'tcpOutgoing', 'utpIncoming', 'utpOutgoing', 'webSeed')

## `wire.uploaded`

Total bytes uploaded to peer.

## `wire.downloaded`

Total bytes downloaded from peer.

## `wire.uploadSpeed`

Peer upload speed, in bytes/sec.

## `wire.downloadSpeed`

Peer download speed, in bytes/sec.

## `wire.remoteAddress`

Peer's remote address. Only exists for tcp/utp peers.

## `wire.remotePort`

Peer's remote port. Only exists for tcp/utp peers.

## `wire.destroy()`

Close the connection with the peer. This however doesn't prevent the peer from simply re-connecting.
