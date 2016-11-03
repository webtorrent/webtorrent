#!/usr/bin/env node

var spawn = require('cross-spawn')

var runSauceLabs = !process.env.CI ||
  (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY)

npmRun('test-node', function () {
  npmRun('test-browser-headless', function () {
    if (runSauceLabs) {
      npmRun('test-browser')
    }
  })
})

function npmRun (scriptName, onSuccess) {
  spawn('npm', ['run', scriptName], { stdio: 'inherit' }).on('close', function (code) {
    if (code === 0 && onSuccess) {
      onSuccess(code)
    } else {
      process.exit(code)
    }
  })
}
