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

## Quick Examples

### Downloading a torrent (in the browser)

```js
var WebTorrent = require('webtorrent')

var client = new WebTorrent()

// Sintel, a free, Creative Commons movie
var torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d'

client.add(torrentId, function (torrent) {
  // Torrents can contain many files. Let's use the first.
  var file = torrent.files[0]

  // Display the file by adding it to the DOM.
  // Supports video, audio, image files, and more!
  file.appendTo('body')
})
```

This supports video, audio, images, PDFs, Markdown, [and more][render-media], right
out of the box. There are additional ways to access file content directly, including
as a node-style stream, Buffer, or Blob URL.

Video and audio content can be streamed, i.e. playback will start before the full
file is downloaded. Seeking works too – WebTorrent dynamically fetches
the needed torrent pieces from the network on-demand.

### Creating a new torrent and seed it (in the browser)

```js
var dragDrop = require('drag-drop')
var WebTorrent = require('webtorrent')

var client = new WebTorrent()

// When user drops files on the browser, create a new torrent and start seeding it!
dragDrop('body', function (files) {
  client.seed(files, function (torrent) {
    console.log('Client is seeding ' + torrent.magnetURI)
  })
})
```

This example uses the [`drag-drop`][drag-drop] package, to make the HTML5 Drag and
Drop API easier to work with.

### Download and save a torrent (in Node.js)

```js
var WebTorrent = require('webtorrent')
var fs = require('fs')

var client = new WebTorrent()
var magnetURI = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d'

client.add(magnetURI, function (torrent) {
  torrent.files.forEach(function (file) {
    console.log('Started saving ' + file.name)

    file.getBuffer(function (err, buffer) {
      if (err) {
        console.error('Error downloading ' + file.name)
        return
      }
      fs.writeFile(file.name, buffer, function (err) {
        console.error('Error saving ' + file.name)
      })
    })
  })
})
```

## More Documentation

Check out the [API Documentation](/docs) and [FAQ](/faq) which are very detailed.

[render-media]: https://github.com/feross/render-media/blob/master/index.js#L12-L20
[drag-drop]: https://npmjs.com/package/drag-drop
