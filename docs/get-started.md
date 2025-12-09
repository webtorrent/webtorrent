# Get Started with WebTorrent

**WebTorrent** is the first torrent client that works in the **browser**. It's easy
to get started!

## Install

To start using WebTorrent, simply include the
[`webtorrent`](https://esm.sh/webtorrent)
script on your page.

```html
<script type='module'>
  import WebTorrent from 'https://esm.sh/webtorrent/dist/webtorrent.min.js'
</script>
```

### Browserify and Webpack

WebTorrent also works great with [browserify](http://browserify.org/), [webpack](https://webpack.js.org/) and other bundlers, which let
you use [node.js](http://nodejs.org/) style `require()` to organize your browser
code, and load packages installed by [npm](https://npmjs.org/).

For an example webpack config see [the webpack bundle config used by webtorrent](/scripts/browser.webpack.js).

```
npm install webtorrent
```

Then use `WebTorrent` like this:

```js
import WebTorrent from 'webtorrent'
```

## Quick Examples

### Downloading a torrent (in the browser)

```js
import WebTorrent from 'webtorrent'

const client = new WebTorrent()

// Sintel, a free, Creative Commons movie
const torrentId = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent'

const controller = await navigator.serviceWorker.register('./sw.min.js', { scope: './' })
await navigator.serviceWorker.ready
client.createServer({ controller })

client.add(torrentId, torrent => {
  // Torrents can contain many files. Let's use the .mp4 file
  const file = torrent.files.find(file => {
    return file.name.endsWith('.mp4')
  })

  // Display the file by adding it to the DOM.
  // Supports video, audio, image files, and more!
  file.streamTo(document.querySelector('video'))
})
```

This supports video, audio, images, PDFs, HTML, right out of the box. There are additional ways to access file content directly, including as a node-style stream, ArrayBuffer, or Blob.

Video and audio content can be streamed, i.e. playback will start before the full file is downloaded. Seeking works too – WebTorrent dynamically fetches
the needed torrent pieces from the network on-demand.

**Note:** Downloading a torrent automatically seeds it, making it available for download by other peers.

### Creating a new torrent and seed it (in the browser)

```js
import dragDrop from 'drag-drop'
import WebTorrent from 'webtorrent'

const client = new WebTorrent()

// When user drops files on the browser, create a new torrent and start seeding it!
dragDrop('body', files => {
  client.seed(files, torrent => {
    console.log('Client is seeding ' + torrent.magnetURI)
  })
})
```

This example uses the [`drag-drop`][drag-drop] package, to make the HTML5 Drag and
Drop API easier to work with.

**Note:** If you do not use browserify, use the standalone file
[`dragdrop.min.js`](https://bundle.run/drag-drop).
This exports a `DragDrop` function on `window`.

### Download and save a torrent (in Node.js)

```js
import WebTorrent from 'webtorrent'

const client = new WebTorrent()

const magnetURI = 'magnet: ...'

client.add(magnetURI, { path: '/path/to/folder' }, torrent => {
  torrent.on('done', () => {
    console.log('torrent download finished')
  })
})
```

### Creating a new torrent and seed it (in Node.js)

**Note:** Seeding a torrent that can be downloaded by browser peers (i.e. with support for WebRTC) requires [webtorrent-hybrid](https://github.com/webtorrent/webtorrent-hybrid).

```js
import WebTorrent from 'webtorrent-hybrid'
const client = new WebTorrent()

client.seed('/seed-me.txt', torrent => {
    console.log('Client is seeding ' + torrent.magnetURI)
})
```

where **seed-me.txt** is a text file which is going to be seeded as a torrent.

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

    <script type='module'>
      // Include the latest version of WebTorrent
      import WebTorrent from 'https://esm.sh/webtorrent/dist/webtorrent.min.js'
      
      const client = new WebTorrent()

      client.on('error', err => {
        console.error('ERROR: ' + err.message)
      })

      document.querySelector('form').addEventListener('submit', e => {
        e.preventDefault() // Prevent page refresh

        const torrentId = document.querySelector('form input[name=torrentId]').value
        log('Adding ' + torrentId)
        client.add(torrentId, onTorrent)
      })

      async function onTorrent (torrent) {
        log('Got torrent metadata!')
        log(
          'Torrent info hash: ' + torrent.infoHash + ' ' +
          '<a href="' + torrent.magnetURI + '" target="_blank">[Magnet URI]</a> ' +
          '<a href="' + URL.createObjectURL(torrent.torrentFileBlob) + '" target="_blank" download="' + torrent.name + '.torrent">[Download .torrent]</a>'
        )

        // Print out progress every 5 seconds
        const interval = setInterval(() => {
          log('Progress: ' + (torrent.progress * 100).toFixed(1) + '%')
        }, 5000)

        torrent.on('done', () => {
          log('Progress: 100%')
          clearInterval(interval)
        })

        // Render all files into to the page
        for (const file of torrent.files) {
          try {
            const blob = await file.blob()
            document.querySelector('.log').append(file.name)
            log('(Blob URLs only work if the file is loaded from a server. "http//localhost" works. "file://" does not.)')
            log('File done.')
            log('<a href="' + URL.createObjectURL(blob) + '">Download full file: ' + file.name + '</a>')
          } catch (err) {
            if (err) log(err.message)
          }
        }
      }

      function log (str) {
        const p = document.createElement('p')
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
      border-bottom: 1px dashed rgba(255, 255, 255, 0.3);
    }

    .is-seed {
      background-color: #154820;
      transition: .5s .5s background-color ease-in-out;
    }

    body {
      background-color: #2a3749;
      margin: 0;
      height: 100%;
    }

    #status {
      color: #fff;
      font-size: 17px;
      padding: 5px;
    }

    a:link,
    a:visited {
      color: #30a247;
      text-decoration: none;
    }
  </style>
</head>

<body>
  <div>
    <div id="progressBar"></div>
    <video id="output" controls></video>
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
      — <span id="remaining"></span><br />
      &#x2198;<code id="downloadSpeed">0 b/s</code>
      / &#x2197;<code id="uploadSpeed">0 b/s</code>
    </div>
  </div>

  <!-- Moment is used to show a human-readable remaining time -->
  <script src="http://momentjs.com/downloads/moment.min.js"></script>

  <script type="module">
    // Include the latest version of WebTorrent
    import WebTorrent from './webtorrent.min.js'

    const torrentId = 'https://webtorrent.io/torrents/sintel.torrent'

    const client = new WebTorrent()

    // HTML elements
    const $body = document.body
    const $progressBar = document.querySelector('#progressBar')
    const $numPeers = document.querySelector('#numPeers')
    const $downloaded = document.querySelector('#downloaded')
    const $total = document.querySelector('#total')
    const $remaining = document.querySelector('#remaining')
    const $uploadSpeed = document.querySelector('#uploadSpeed')
    const $downloadSpeed = document.querySelector('#downloadSpeed')

    const controller = await navigator.serviceWorker.register('./sw.min.js', { scope: './' })
    await navigator.serviceWorker.ready
    client.createServer({ controller })

    // Download the torrent
    client.add(torrentId, torrent => {
      // Torrents can contain many files. Let's use the .mp4 file
      const file = torrent.files.find(file => {
        return file.name.endsWith('.mp4')
      })

      // Stream the file in the browser
      file.streamTo(document.querySelector('#output'))

      // Trigger statistics refresh
      torrent.on('done', onDone)
      setInterval(onProgress, 500)
      onProgress()

      // Statistics
      function onProgress () {
        // Peers
        $numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers')

        // Progress
        const percent = Math.round(torrent.progress * 100 * 100) / 100
        $progressBar.style.width = percent + '%'
        $downloaded.innerHTML = prettyBytes(torrent.downloaded)
        $total.innerHTML = prettyBytes(torrent.length)

        // Remaining time
        let remaining
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
    function prettyBytes (num) {
      const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
      const neg = num < 0
      if (neg) num = -num
      if (num < 1) return (neg ? '-' : '') + num + ' B'
      const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
      const unit = units[exponent]
      num = Number((num / Math.pow(1000, exponent)).toFixed(2))
      return (neg ? '-' : '') + num + ' ' + unit
    }
  </script>
</body>

</html>
```

## More Documentation

Check out the [API Documentation](//webtorrent.io/docs) and [FAQ](//webtorrent.io/faq) for more details.

[drag-drop]: https://npmjs.com/package/drag-drop
