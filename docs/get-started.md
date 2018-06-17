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
var torrentId = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent'

client.add(torrentId, function (torrent) {
  // Torrents can contain many files. Let's use the .mp4 file
  var file = torrent.files.find(function (file) {
    return file.name.endsWith('.mp4')
  })

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

var client = new WebTorrent()

var magnetURI = 'magnet: ...'

client.add(magnetURI, { path: '/path/to/folder' }, function (torrent) {
  torrent.on('done', function () {
    console.log('torrent download finished')
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
      <input name="torrentId", placeholder="magnet:" value="magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent">
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

### HTML example with status showing UI

This complete HTML example mimics the UI of the
[webtorrent.io](https://webtorrent.io) homepage. It downloads the
[sintel.torrent](https://webtorrent.io/torrents/sintel.torrent) file, streams it in
the browser and outputs some statistics to the user (peers, progress, remaining
time, speed...).

You can try it right now on [CodePen](http://codepen.io/yciabaud/full/XdOeWM/) to
see what it looks like and play around with it!

Feel free to replace `torrentId` with other torrent files, or magnet links, but
keep in mind that the browser can only download torrents that are seeded by
WebRTC peers (web peers). Use [WebTorrent Desktop](https://webtorrent.io/desktop)
or [Instant.io](https://instant.io) to seed torrents to the WebTorrent network.

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>WebTorrent video player</title>
    <style>
      #output video {
        width: 100%;
      }
      #progressBar {
          height: 5px;
          width: 0%;
          background-color: #35b44f;
          transition: width .4s ease-in-out;
      }
      body.is-seed .show-seed {
          display: inline;
      }
      body.is-seed .show-leech {
          display: none;
      }
      .show-seed {
          display: none;
      }
      #status code {
          font-size: 90%;
          font-weight: 700;
          margin-left: 3px;
          margin-right: 3px;
          border-bottom: 1px dashed rgba(255,255,255,0.3);
      }

      .is-seed #hero {
          background-color: #154820;
          transition: .5s .5s background-color ease-in-out;
      }
      #hero {
          background-color: #2a3749;
      }
      #status {
          color: #fff;
          font-size: 17px;
          padding: 5px;
      }
      a:link, a:visited {
          color: #30a247;
          text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div id="hero">
      <div id="output">
        <div id="progressBar"></div>
        <!-- The video player will be added here -->
      </div>
      <!-- Statistics -->
      <div id="status">
        <div>
          <span class="show-leech">Downloading </span>
          <span class="show-seed">Seeding </span>
          <code>
            <!-- Informative link to the torrent file -->
            <a id="torrentLink" href="https://webtorrent.io/torrents/sintel.torrent">sintel.torrent</a>
          </code>
          <span class="show-leech"> from </span>
          <span class="show-seed"> to </span>
          <code id="numPeers">0 peers</code>.
        </div>
        <div>
          <code id="downloaded"></code>
          of <code id="total"></code>
          — <span id="remaining"></span><br/>
          &#x2198;<code id="downloadSpeed">0 b/s</code>
          / &#x2197;<code id="uploadSpeed">0 b/s</code>
        </div>
      </div>
    </div>
    <!-- Include the latest version of WebTorrent -->
    <script src="https://cdn.jsdelivr.net/webtorrent/latest/webtorrent.min.js"></script>

    <!-- Moment is used to show a human-readable remaining time -->
    <script src="http://momentjs.com/downloads/moment.min.js"></script>

    <script>
      var torrentId = 'https://webtorrent.io/torrents/sintel.torrent'

      var client = new WebTorrent()

      // HTML elements
      var $body = document.body
      var $progressBar = document.querySelector('#progressBar')
      var $numPeers = document.querySelector('#numPeers')
      var $downloaded = document.querySelector('#downloaded')
      var $total = document.querySelector('#total')
      var $remaining = document.querySelector('#remaining')
      var $uploadSpeed = document.querySelector('#uploadSpeed')
      var $downloadSpeed = document.querySelector('#downloadSpeed')

      // Download the torrent
      client.add(torrentId, function (torrent) {

        // Torrents can contain many files. Let's use the .mp4 file
        var file = torrent.files.find(function (file) {
          return file.name.endsWith('.mp4')
        })

        // Stream the file in the browser
        file.appendTo('#output')

        // Trigger statistics refresh
        torrent.on('done', onDone)
        setInterval(onProgress, 500)
        onProgress()

        // Statistics
        function onProgress () {
          // Peers
          $numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers')

          // Progress
          var percent = Math.round(torrent.progress * 100 * 100) / 100
          $progressBar.style.width = percent + '%'
          $downloaded.innerHTML = prettyBytes(torrent.downloaded)
          $total.innerHTML = prettyBytes(torrent.length)

          // Remaining time
          var remaining
          if (torrent.done) {
            remaining = 'Done.'
          } else {
            remaining = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()
            remaining = remaining[0].toUpperCase() + remaining.substring(1) + ' remaining.'
          }
          $remaining.innerHTML = remaining

          // Speed rates
          $downloadSpeed.innerHTML = prettyBytes(torrent.downloadSpeed) + '/s'
          $uploadSpeed.innerHTML = prettyBytes(torrent.uploadSpeed) + '/s'
        }
        function onDone () {
          $body.className += ' is-seed'
          onProgress()
        }
      })

      // Human readable bytes util
      function prettyBytes(num) {
        var exponent, unit, neg = num < 0, units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        if (neg) num = -num
        if (num < 1) return (neg ? '-' : '') + num + ' B'
        exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
        num = Number((num / Math.pow(1000, exponent)).toFixed(2))
        unit = units[exponent]
        return (neg ? '-' : '') + num + ' ' + unit
      }
    </script>
  </body>
</html>
```

## More Documentation

Check out the [API Documentation](//webtorrent.io/docs) and [FAQ](//webtorrent.io/faq) for more details.

[render-media]: https://github.com/feross/render-media/blob/master/index.js#L12-L20
[drag-drop]: https://npmjs.com/package/drag-drop
