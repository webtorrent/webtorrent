WebTorrent is a streaming torrent client for **Node.js** and the **web**. WebTorrent
provides the same API in both environments.

To use WebTorrent in the browser, [WebRTC] support is required (Chrome, Firefox, Opera).

[webrtc]: https://en.wikipedia.org/wiki/WebRTC

## Install

```bash
npm install webtorrent
```

## Quick Example

```js
var client = new WebTorrent()

var torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d'

client.add(torrentId, function (torrent) {
  // Torrents can contain many files. Let's use the first.
  var file = torrent.files[0]

  // Display the file by adding it to the DOM. Supports video, audio, image, etc. files
  file.appendTo('body')
})
```
