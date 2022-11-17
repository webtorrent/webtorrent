import test from 'tape'
import WebTorrent from '../../index.js'

// The image append/render tests don't work in electron, so skip them
// TODO get these working
// logic taken from https://github.com/atom/electron/issues/2288#issuecomment-123147993

// TODO: test sw renderer, airtap doesnt support static files
// const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
// img.name = 'img.png'
// if (!(global && global.process && global.process.versions && global.process.versions.electron)) {
//   test('sw renderer', t => {
//     t.plan(1)
//     const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

//     client.on('error', err => { t.fail(err) })
//     client.on('warning', err => { t.fail(err) })
//     try {
//       navigator.serviceWorker.register('../../sw.min.js', { scope: './' }).then(reg => {
//         const worker = reg.active || reg.waiting || reg.installing
//         function checkState (worker) {
//           t.ok(worker.state === 'activated')
//           return worker.state === 'activated' && client.createServer({ controller: reg }) && download()
//         }
//         if (!checkState(worker)) {
//           worker.addEventListener('statechange', ({ target }) => checkState(target))
//         }
//       })
//     } catch (e) {
//       t.err(e)
//     }
//     const tag = document.createElement('img')
//     document.body.appendChild(tag)
//     function verifyImage (t, elem) {
//       t.ok(typeof elem.src === 'string')
//       t.ok(elem.src.includes('webtorrent'))
//       t.equal(elem.parentElement.nodeName, 'BODY')
//       elem.remove()
//     }
//     function download () {
//       client.seed(img, torrent => {
//         torrent.files[0].streamTo(tag, elem => {
//           verifyImage(t, elem)
//           client.destroy(err => {
//             t.error(err, 'client destroyed')
//           })
//         })
//       })
//     }
//   })
// }

test('WebTorrent.WEBRTC_SUPPORT', t => {
  t.plan(2)

  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })

  client.on('error', err => { t.fail(err) })
  client.on('warning', err => { t.fail(err) })

  t.equal(WebTorrent.WEBRTC_SUPPORT, true)

  client.destroy(err => {
    t.error(err, 'client destroyed')
  })
})
