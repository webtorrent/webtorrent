#!/usr/bin/env node

var cp = require('child_process')

var BIN = process.platform === 'linux'
  ? '/bin/google-chrome'
  : '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
var ARGS = ['--load-and-launch-app=chrome']

var child = cp.spawn(BIN, ARGS)
