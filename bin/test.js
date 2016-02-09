#!/usr/bin/env node

var spawn = require('cross-spawn-async')

var runBrowserTests = process.env.TRAVIS && (!process.env.TRAVIS_PULL_REQUEST ||
  process.env.TRAVIS_PULL_REQUEST === 'false')

npmRun('test-node', function (code) {
  if (code === 0) {
    var scriptName = runBrowserTests ? 'test-browser' : 'test-browser-headless'
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
