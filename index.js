// var _log = console.log.bind(console)
// window.console.log = window.log = function () {
//   var args = [].slice.apply(arguments)
//   args = args.map(function (arg) {
//     if (!Array.isArray(arg) && typeof arg === 'object')
//       return JSON.stringify(arg)
//     else
//       return arg
//   })
//   var elem = document.getElementById('console')
//   elem.innerHTML += args.join(', ') + '<br>'
//   elem.scrollTop = elem.scrollHeight
//   _log.apply(null, args)
// }

// var _error = console.error.bind(console)
// window.console.error = function () {
//   var args = [].slice.apply(arguments)
//   var elem = document.getElementById('console')
//   elem.innerHTML += '<span style="color: red;">' + args.join(', ') + '</span><br>'
//   elem.scrollTop = elem.scrollHeight
//   _error.apply(null, args)
// }

var TorrentManager = require('./lib/TorrentManager')

var isChromeApp = !!(typeof window !== 'undefined' && window.chrome &&
    window.chrome.app && window.chrome.app.runtime)
if (isChromeApp)
  console.log('This is a chrome app.')


var manager = new TorrentManager()

manager.add('magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&dn=Leaves+of+Grass+by+Walt+Whitman.epub')

manager.on('error', function (err) {
  console.error(err)
  // TODO: Show error in UI somehow
})