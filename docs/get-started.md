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
var torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel-1024-surround.mp4'

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

**Note:** If you do not use browserify, use the standalone file
[`dragdrop.min.js`](https://raw.githubusercontent.com/feross/drag-drop/master/dragdrop.min.js).
This exports a `DragDrop` function on `window`.

### Download and save a torrent (in Node.js)

```js
var WebTorrent = require('webtorrent')
var fs = require('fs')

var client = new WebTorrent()

var magnetURI = 'magnet:...'

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

### Complete HTML page example

Looking for a more complete example? Look no further! This HTML example has a form input
where the user can paste a magnet link and start a download over WebTorrent.

Best of all, it's a single HTML page, under 70 lines!

If the torrent contains images, videos, audio, or other playable files (with supported
codecs), they will be added to the DOM and streamed, even before the full content is
downloaded.

```html
<!doctype html>
<html>
  <body>
    <h1>Download files using the WebTorrent protocol (BitTorrent over WebRTC).</h1>

    <form>
      <label for="torrentId">Download from a magnet link: </label>
      <input name="torrentId", placeholder="magnet:" value="magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel-1024-surround.mp4">
      <button type="submit">Download</button>
    </form>

    <h2>Log</h2>
    <div class="log"></div>

    <!-- Include the latest version of WebTorrent -->
    <script src="https://cdn.jsdelivr.net/webtorrent/latest/webtorrent.min.js"></script>

    <script>
      var client = new WebTorrent()

      client.on('error', function (err) {
        console.error('ERROR: ' + err.message)
      })

      document.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault() // Prevent page refresh

        var torrentId = document.querySelector('form input[name=torrentId]').value
        log('Adding ' + torrentId)
        client.add(torrentId, onTorrent)
      })

      function onTorrent (torrent) {
        log('Got torrent metadata!')
        log(
          'Torrent info hash: ' + torrent.infoHash + ' ' +
          '<a href="' + torrent.magnetURI + '" target="_blank">[Magnet URI]</a> ' +
          '<a href="' + torrent.torrentFileBlobURL + '" target="_blank" download="' + torrent.name + '.torrent">[Download .torrent]</a>'
        )

        // Print out progress every 5 seconds
        var interval = setInterval(function () {
          log('Progress: ' + (torrent.progress * 100).toFixed(1) + '%')
        }, 5000)

        torrent.on('done', function () {
          log('Progress: 100%')
          clearInterval(interval)
        })

        // Render all files into to the page
        torrent.files.forEach(function (file) {
          file.appendTo('.log')
          log('(Blob URLs only work if the file is loaded from a server. "http//localhost" works. "file://" does not.)')
          file.getBlobURL(function (err, url) {
            if (err) return log(err.message)
            log('File done.')
            log('<a href="' + url + '">Download full file: ' + file.name + '</a>')
          })
        })
      }

      function log (str) {
        var p = document.createElement('p')
        p.innerHTML = str
        document.querySelector('.log').appendChild(p)
      }
    </script>
  </body>
</html>
```

## More Documentation

Check out the [API Documentation](//webtorrent.io/docs) and [FAQ](//webtorrent.io/faq) for more details.

[render-media]: https://github.com/feross/render-media/blob/master/index.js#L12-L20
[drag-drop]: https://npmjs.com/package/drag-drop
