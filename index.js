if (window.name === 'app') {
  require('./lib/app')()
} else {
  require('./lib/background')()
}






