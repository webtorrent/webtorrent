#!/usr/bin/env node

var spawn = require('cross-spawn-async')
var findNearestFile = require('find-nearest-file')
var path = require('path')
var userHome = require('user-home')
var pathExists = require('path-exists')

// .zuulrc logic from https://github.com/defunctzombie/zuul/blob/a0de46a5906c84b19f655c487f7c8debe938984d/bin/zuul#L384
var zuulrcPath = findNearestFile('.zuulrc') || path.join(userHome, '.zuulrc')
var hasSauceLabEnvVars = process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY
var runSauceLabs = hasSauceLabEnvVars || pathExists.sync(zuulrcPath)

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
