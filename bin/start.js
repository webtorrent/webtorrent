#!/usr/bin/env node

var cp = require('child_process')

var BIN = '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
var ARGS = ['--load-and-launch-app=chrome']

var child = cp.spawn(BIN, ARGS)

// Nodemon is trying to kill us, so kill Chrome
process.once('SIGUSR2', function () {
  child.kill()
  process.kill(process.pid, 'SIGUSR2')
})