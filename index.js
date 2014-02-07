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
if (window.name === 'app') {
  require('./lib/app')()
} else {
  require('./lib/background')()
}

// var _error = console.error.bind(console)
// window.console.error = function () {
//   var args = [].slice.apply(arguments)
//   var elem = document.getElementById('console')
//   elem.innerHTML += '<span style="color: red;">' + args.join(', ') + '</span><br>'
//   elem.scrollTop = elem.scrollHeight
//   _error.apply(null, args)
// }


var isChromeApp = !!(typeof window !== 'undefined' && window.chrome &&
    window.chrome.app && window.chrome.app.runtime)
if (isChromeApp)
  console.log('This is a chrome app.')



