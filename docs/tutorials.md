# WebTorrent Tutorials

## Integrate WebTorrent with Video Players

WebTorrent can be used to stream videos. WebTorrent can render the incoming video to an HTML `<video>` element. Below are some examples for various video players.

### [Service Worker Renderer](https://github.com/webtorrent/webtorrent/blob/master/docs/api.md#clientloadworkercontroller-function-callback-controller---browser-only)

Code example:

```js
import WebTorrent from 'https://esm.sh/webtorrent'

const client = new WebTorrent()
const torrentId = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent'
const player = document.querySelector('video')

function download () {
  client.add(torrentId, torrent => {
    // Torrents can contain many files. Let's use the .mp4 file
    const file = torrent.files.find(file => file.name.endsWith('.mp4'))
    // Log streams emitted by the video player
    file.on('stream', ({ stream, file, req }) => {
      if (req.destination === 'video') {
        console.log(`Video player requested data from ${file.name}! Ranges: ${req.headers.range}`)
      }
    })
    // Stream to a <video> element by providing an the DOM element
    file.streamTo(player)
    console.log('Ready to play!')
  })
}
navigator.serviceWorker.register('./sw.min.js', { scope: './' }).then(reg => {
  const worker = reg.active || reg.waiting || reg.installing
  function checkState (worker) {
    return worker.state === 'activated' && client.createServer({ controller: reg }) && download()
  }
  if (!checkState(worker)) {
    worker.addEventListener('statechange', ({ target }) => checkState(target))
  }
})
```

### [Video.js](https://videojs.com/)

Video.js is an open source HTML5 & Flash video player. We include the dependencies for `video.js` using CDN. A normal `<video>` element is converted to `video.js` by passing `class="video-js"` and `data-setup="{}"`. For more information visit the [docs](https://docs.videojs.com/tutorial-setup.html).

**Note**: Unlike in the Default HTML5 Video Player example we don't directly pass the ID of the `<video>` element but pass `` `video#${id}_html5_api` `` (JS String Literal). It is because `video.js` wraps the `<video>` element in a `<div>`.

Original code:

```html
<video
  id="video-container"
  class="video-js"
  data-setup="{}"
  controls="true"
></video>
```

Code rendered on the browser:

```html
<div>
  <video id="video-container_html5_api"></video>
</div>
```

Code example:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Web Torrent Tutorial</title>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/video.js/7.8.1/video-js.min.css" />
    <script src="//cdnjs.cloudflare.com/ajax/libs/video.js/7.8.1/video.min.js"></script>
  </head>
  <body>
    <video id="video-container" class="video-js" data-setup="{}" controls="true"></video>
    <script type='module'>   
      import WebTorrent from 'https://esm.sh/webtorrent'
      const client = new WebTorrent()
      const torrentId = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent'
      const player = document.querySelector('video')

      function download () {
        client.add(torrentId, torrent => {
          // Torrents can contain many files. Let's use the .mp4 file
          const file = torrent.files.find(file => file.name.endsWith('.mp4'))

          // Stream to a <video> element by providing an the DOM element
          file.streamTo(player)
          console.log('Ready to play!')
        })
      }
      navigator.serviceWorker.register('./sw.min.js', { scope: './' }).then(reg => {
        const worker = reg.active || reg.waiting || reg.installing
        function checkState (worker) {
          return worker.state === 'activated' && client.createServer({ controller: reg }) && download()
        }
        if (!checkState(worker)) {
          worker.addEventListener('statechange', ({ target }) => checkState(target))
        }
      })
    </script>
  </body>
</html>

```
