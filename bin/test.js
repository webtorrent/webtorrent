#!/usr/bin/env node

var spawn = require('cross-spawn-async')

var runSauceLabs = process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY

npmRun('test-node', function (code) {
  if (code === 0) {
    var scriptName = runSauceLabs ? 'test-browser' : 'test-browser-headless'
    npmRun(scriptName, function (code) {
      process.exit(code)
    })
  } else {
    process.exit(code)
  }
})

function npmRun (scriptName, onClose) {
  spawn('npm', ['run', scriptName], { stdio: 'inherit' }).on('close', onClose)
}
