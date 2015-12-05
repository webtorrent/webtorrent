#!/usr/bin/env node

var spawn = require('cross-spawn-async')
var minimist = require('minimist')
var fs = require('fs')
var path = require('path')
var clivas = require('clivas')

var argv = minimist(process.argv.slice(2), {
  alias: {
    l: 'local',
    b: 'browser',
    s: 'standard'
  },
  boolean: [ // options that are always boolean
    'local',
    'standard',
    'browser',
    'help'
  ]
})

var runBrowserTests = (!process.env.TRAVIS_PULL_REQUEST ||
  process.env.TRAVIS_PULL_REQUEST === 'false') && argv.local

var command = argv._[0]
if (argv.help || command === 'help') {
  runHelp()
} else if (command === 'coverage' || command === 'test') {
  runTest(command)
} else {
  clivas.line('webtorrent-test: \'' + command + '\' is not a webtorrent-test command. See \'webtorrent-test --help\'')
}

function runHelp () {
  fs.readFileSync(path.join(__dirname, 'ascii-logo.txt'), 'utf8')
    .split('\n')
    .forEach(function (line) {
      clivas.line('{bold:' + line.substring(0, 20) + '}{red:' + line.substring(20) + '}')
    })

  console.log(function () {
    /*
Usage:
      webtorrent-test [command] <options>

Example:
      webtorrent-test test --local --browser

Commands:
      test  Run the nodejs test suite
      coverage Generate test coverage data (via istanbul)

Options:
      -l, --local 		    run test suite for local development
      -b, --browser       run browser test suite (along with existing test suite)
      -b, --standard      run js `standard` code linting tool before test suite

    */
  }.toString().split(/\n/).slice(2, -2).join('\n'))
  process.exit(0)
}

function runTest (testType) {
  var testCommand = testType
  var browserTestCommand = 'test'

  if (argv.local) {
    if (testType === 'coverage') {
      testCommand += '-local'
    } else {
      testCommand += '-node'
    }

    if (argv.browser) {
      browserTestCommand += '-browser-local'
    }
  } else {
    browserTestCommand += '-browser'
    testCommand += '-node'
  }

  if (argv.standard) {
    var node = spawn('sh', ['-c', 'node_modules/.bin/standard'], { stdio: 'inherit' })
    node.on('close', function (code) {
      if (code === 0) {
        executeTest(testCommand, browserTestCommand)
      }
    })
  } else {
    executeTest(testCommand, browserTestCommand)
  }

  function executeTest (_command, _browserCommand) {
    var node = spawn('npm', ['run', _command], { stdio: 'inherit' })
    node.on('close', function (code) {
      if (code === 0 && runBrowserTests && argv.browser) {
        var browser = spawn('npm', ['run', _browserCommand], { stdio: 'inherit' })
        browser.on('close', function (code) {
          process.exit(code)
        })
      } else {
        process.exit(code)
      }
    })
  }
}
