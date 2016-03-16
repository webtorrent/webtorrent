# Get Started with WebTorrent

**WebTorrent** is the first torrent client that works in the **browser**. It's easy
to get started!

## Install

To start using WebTorrent, simply include the
[`webtorrent.min.js`](https://cdn.jsdelivr.net/webtorrent/latest/webtorrent.min.js)
script on your page.

```html
<script src="webtorrent.min.js"></script>
```

This provides a `WebTorrent` function on the `window` object.

### Browserify

WebTorrent also works great with [browserify](http://browserify.org/), which lets
you use [node.js](http://nodejs.org/) style `require()` to organize your browser
code, and load packages installed by [npm](https://npmjs.org/).

```
npm install webtorrent
```

Then use `WebTorrent` like this:

```js
var WebTorrent = require('webtorrent')
```

## Quick Example

### Downloading a torrent

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

This supports video, audio, images, PDFs, Markdown, [and more][append-to], right
out of the box. There are additional ways to access file content directly, including
as a node-style stream, Buffer, or Blob URL.

Video and audio content can be streamed, i.e. playback will start before the full
file is downloaded. Seeking works too – WebTorrent dynamically fetches
the needed torrent pieces from the network on-demand.

### Creating a new torrent and seeding it

```js
var dragDrop = require('drag-drop')
var WebTorrent = require('webtorrent')

var client = new WebTorrent()

// When user drops files on the browser, create a new torrent and start seeding it!
dragDrop('body', function (files) {
  client.seed(files, function (torrent) {
    console.log('Client is seeding ' + torrent.infoHash)
  })
})
```

This example uses the [`drag-drop`][drag-drop] package, to make the HTML5 Drag and
Drop API easier to work with.

### More examples

There are more examples in the [examples](https://github.com/feross/webtorrent/tree/master/examples) folder.


## Full tutorial coming soon!

For now, check out the [API Documentation](/docs) and [FAQ](/faq) which are very
detailed.

[append-to]: https://github.com/feross/webtorrent/blob/master/lib/append-to.js#L6-L14
[drag-drop]: https://npmjs.com/package/drag-drop
