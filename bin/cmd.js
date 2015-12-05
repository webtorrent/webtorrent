#!/usr/bin/env node

var search = require('search-kat.ph')
var choices = require('choices')
var clivas = require('clivas')
var cp = require('child_process')
var createTorrent = require('create-torrent')
var executable = require('executable')
var fs = require('fs')
var inquirer = require('inquirer')
var minimist = require('minimist')
var moment = require('moment')
var networkAddress = require('network-address')
var parseTorrent = require('parse-torrent')
var path = require('path')
var prettyBytes = require('pretty-bytes')
var WebTorrent = require('../')
var zeroFill = require('zero-fill')

process.title = 'WebTorrent'

var expectedError = false
process.on('exit', function (code) {
  if (code === 0 || expectedError) return // normal exit
  if (code === 130) return // intentional exit with Control-C

  clivas.line('\n{red:UNEXPECTED ERROR:} If this is a bug in WebTorrent, report it!')
  clivas.line('{green:OPEN AN ISSUE:} https://github.com/feross/webtorrent/issues\n')
  clivas.line(
    'DEBUG INFO: ' +
    'webtorrent ' + require('../package.json').version + ', ' +
    'node ' + process.version + ', ' +
    process.platform + ' ' + process.arch + ', ' +
    'exit ' + code
  )
})

process.on('SIGINT', gracefulExit)
process.on('SIGTERM', gracefulExit)

var argv = minimist(process.argv.slice(2), {
  alias: {
    p: 'port',
    b: 'blocklist',
    t: 'subtitles',
    s: 'select',
    i: 'index',
    o: 'out',
    q: 'quiet',
    h: 'help',
    v: 'version'
  },
  boolean: [ // options that are always boolean
    'airplay',
    'chromecast',
    'mplayer',
    'mpv',
    'vlc',
    'xbmc',
    'stdout',
    'select',
    'quiet',
    'help',
    'version',
    'verbose'
  ],
  string: [ // options that are always strings
    'out',
    'blocklist',
    'subtitles',
    'on-done',
    'on-exit'
  ],
  default: {
    port: 8000
  }
})

if (process.env.DEBUG || argv.stdout) {
  argv.quiet = argv.q = true
}

var started = Date.now()
function getRuntime () {
  return Math.floor((Date.now() - started) / 1000)
}

var VLC_ARGS = '--play-and-exit --video-on-top --quiet'
if (process.env.DEBUG) {
  VLC_ARGS += ' -q'
} else {
  VLC_ARGS += ' --extraintf=http:logger --verbose=2 --file-logging --logfile=vlc-log.txt'
}
var MPLAYER_EXEC = 'mplayer -ontop -really-quiet -noidx -loop 0'
var MPV_EXEC = 'mpv --ontop --really-quiet --loop=no'
var OMX_EXEC = 'omxplayer -r -o ' + (typeof argv.omx === 'string' ? argv.omx : 'hdmi')

if (argv.subtitles) {
  VLC_ARGS += ' --sub-file=' + argv.subtitles
  MPLAYER_EXEC += ' -sub ' + argv.subtitles
  MPV_EXEC += ' --sub-file=' + argv.subtitles
  OMX_EXEC += ' --subtitles ' + argv.subtitles
}

function checkPermission (filename) {
  try {
    if (!executable.sync(filename)) {
      errorAndExit('Script "' + filename + '" is not executable')
    }
  } catch (err) {
    errorAndExit('Script "' + filename + '" does not exist')
  }
}

if (argv['on-done']) {
  checkPermission(argv['on-done'])
  argv['on-done'] = fs.realpathSync(argv['on-done'])
}

if (argv['on-exit']) {
  checkPermission(argv['on-exit'])
  argv['on-exit'] = fs.realpathSync(argv['on-exit'])
}

playerName = argv.airplay ? 'Airplay'
  : argv.chromecast ? 'Chromecast'
  : argv.xbmc ? 'XBMC'
  : argv.vlc ? 'VLC'
  : argv.mplayer ? 'MPlayer'
  : argv.mpv ? 'mpv'
  : argv.omx ? 'OMXPlayer'
  : null

var command = argv._[0]

if (command === 'help' || argv.help) {
  runHelp()
} else if (command === 'version' || argv.version) {
  runVersion()
} else if (command === 'info') {
  runInfo(/* torrentId */ argv._[1])
} else if (command === 'create') {
  runCreate(/* input */ argv._[1])
} else if (command === 'download' || command === 'add') {
  runDownload(/* torrentId */ argv._[1])
} else if (command === 'seed') {
  runSeed(/* input */ argv._[1])
} else if (command === 'search') {
  runSearch(/* query */ argv._[1])
} else if (command) {
  // assume command is "download" when not specified
  runDownload(/* torrentId */ command)
} else {
  runHelp()
}

function runVersion () {
  console.log(require('../package.json').version)
  process.exit(0)
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
    webtorrent [command] <torrent-id> <options>

Example:
    webtorrent download "magnet:..." --vlc

Commands:
    search <search-query>   Search for a torrent on kat.cr
    download <torrent-id>   Download a torrent
    seed <file/folder>      Seed a file or folder
    create <file>           Create a .torrent file
    info <torrent-id>       Show info for a .torrent file or magnet uri

Specify <torrent-id> as one of:
    * magnet uri
    * http url to .torrent file
    * filesystem path to .torrent file
    * info hash (hex string)

Options (streaming):
    --airplay               Apple TV
    --chromecast            Chromecast
    --mplayer               MPlayer
    --mpv                   MPV
    --omx [jack]            omx [default: hdmi]
    --vlc                   VLC
    --xbmc                  XBMC
    --stdout                standard out (implies --quiet)

Options (simple):
    -o, --out [path]        set download destination [default: current directory]
    -s, --select            select individual file in torrent (by index)
    -i, --index [number]    stream a particular file from torrent (by index)
    -v, --version           print the current version

Options (advanced):
    -p, --port [number]     change the http server port [default: 8000]
    -t, --subtitles [path]  load subtitles file
    -b, --blocklist [path]  load blocklist file/http url
    -q, --quiet             don't show UI on stdout
    --on-done [script]      run script after torrent download is done
    --on-exit [script]      run script before program exit
    --verbose               show torrent protocol details

  */
  }.toString().split(/\n/).slice(2, -2).join('\n'))
  process.exit(0)
}

function runInfo (torrentId) {
  var parsedTorrent
  try {
    parsedTorrent = parseTorrent(torrentId)
  } catch (err) {
    // If torrent fails to parse, it could be a filesystem path, so don't consider it
    // an error yet.
  }

  if (!parsedTorrent || !parsedTorrent.infoHash) {
    try {
      parsedTorrent = parseTorrent(fs.readFileSync(torrentId))
    } catch (err) {
      return errorAndExit(err)
    }
  }

  delete parsedTorrent.info
  delete parsedTorrent.infoBuffer

  var output = JSON.stringify(parsedTorrent, undefined, 2)
  if (argv.out) {
    fs.writeFileSync(argv.out, output)
  } else {
    process.stdout.write(output)
  }
}

function runCreate (input) {
  createTorrent(input, function (err, torrent) {
    if (err) return errorAndExit(err)
    if (argv.out) {
      fs.writeFileSync(argv.out, torrent)
    } else {
      process.stdout.write(torrent)
    }
  })
}

var client, href, playerName, server, serving

function runDownload (torrentId) {
  if (!argv.out && !argv.stdout && !playerName) {
    argv.out = process.cwd()
  }

  client = new WebTorrent({
    blocklist: argv.blocklist
  })
  .on('error', fatalError)

  var torrent = client.add(torrentId, { path: argv.out })

  torrent.on('infoHash', function () {
    function updateMetadata () {
      var numPeers = torrent.swarm.numPeers
      clivas.clear()
      clivas.line('{green:fetching torrent metadata from} {bold:%s} {green:peers}', numPeers)
    }

    if (!argv.quiet) {
      updateMetadata()

      torrent.on('wire', updateMetadata)
      torrent.on('metadata', function () {
        clivas.clear()
        torrent.removeListener('wire', updateMetadata)
      })
    }
  })

  torrent.on('verifying', function (data) {
    if (argv.quiet) return
    clivas.clear()
    clivas.line(
      '{green:verifying existing torrent} {bold:%s%} ({bold:%s%} {green:verified})',
      Math.floor(data.percentDone),
      Math.floor(data.percentVerified)
    )
  })

  torrent.on('done', function () {
    if (!argv.quiet) {
      // TODO: expose this data from bittorrent-swarm
      var numActiveWires = torrent.swarm.wires.reduce(function (num, wire) {
        return num + (wire.downloaded > 0)
      }, 0)
      clivas.line(
        'torrent downloaded {green:successfully} from {bold:%s/%s} {green:peers} ' +
        'in {bold:%ss}!',
        numActiveWires,
        torrent.swarm.wires.length,
        getRuntime()
      )
    }
    torrentDone()
  })

  // Start http server
  server = torrent.createServer()

  function initServer () {
    if (torrent.ready) onReady()
    else torrent.once('ready', onReady)
  }

  server.listen(argv.port, initServer)

    .on('error', function (err) {
      // In case the port is unusable
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        // Let the OS choose one for us
        server.listen(0, initServer)
      }
      else throw err
    })

  server.once('connection', function () {
    serving = true
  })

  function onReady () {
    // if no index specified, use largest file
    var index = (typeof argv.index === 'number')
      ? argv.index
      : torrent.files.indexOf(torrent.files.reduce(function (a, b) {
        return a.length > b.length ? a : b
      }))

    if (argv.select) {
      var interactive = process.stdin.isTTY && !!process.stdin.setRawMode
      if (interactive) {
        if (torrent.files.length === 0) return errorAndExit('No files in the torrent')

        var cli = inquirer.prompt([{
          type: 'list',
          name: 'index',
          message: 'Choose a file to download:',
          default: index,
          choices: torrent.files.map(function (file, i) {
            var len = prettyBytes(file.length)
            return {
              name: zeroFill(2, i, ' ') + ': ' + file.name + ' (' + len + ')',
              value: i
            }
          })
        }], function (answers) {
          onSelection(answers.index)
        })

        cli.rl.on('SIGINT', function () {
          return process.exit(0)
        })
      } else {
        torrent.files.forEach(function (file, i) {
          clivas.line(
            '{3+bold:%s}: {magenta:%s} {blue:(%s)}',
            i, file.name, prettyBytes(file.length)
          )
        })
        return process.exit(0)
      }
    } else {
      onSelection(index)
    }
  }

  function onSelection (index) {
    href = (argv.airplay || argv.chromecast || argv.xbmc)
      ? 'http://' + networkAddress() + ':' + server.address().port + '/' + index
      : 'http://localhost:' + server.address().port + '/' + index

    if (playerName) torrent.files[index].select()
    if (argv.stdout) torrent.files[index].createReadStream().pipe(process.stdout)

    var cmd
    if (argv.vlc && process.platform === 'win32') {
      var registry = require('windows-no-runnable').registry
      var key
      if (process.arch === 'x64') {
        try {
          key = registry('HKLM/Software/Wow6432Node/VideoLAN/VLC')
        } catch (e) {}
      } else {
        try {
          key = registry('HKLM/Software/VideoLAN/VLC')
        } catch (err) {}
      }

      if (key) {
        var vlcPath = key.InstallDir.value + path.sep + 'vlc'
        VLC_ARGS = VLC_ARGS.split(' ')
        VLC_ARGS.unshift(href)
        cp.execFile(vlcPath, VLC_ARGS, function (err) {
          if (err) return fatalError(err)
          torrentDone()
        }).unref()
      }
    } else if (argv.vlc) {
      var root = '/Applications/VLC.app/Contents/MacOS/VLC'
      var home = (process.env.HOME || '') + root
      cmd = 'vlc ' + href + ' ' + VLC_ARGS + ' || ' +
        root + ' ' + href + ' ' + VLC_ARGS + ' || ' +
        home + ' ' + href + ' ' + VLC_ARGS
    } else if (argv.mplayer) {
      cmd = MPLAYER_EXEC + ' ' + href
    } else if (argv.mpv) {
      cmd = MPV_EXEC + ' ' + href
    } else if (argv.omx) {
      cmd = OMX_EXEC + ' ' + href
    }

    if (cmd) {
      cp.exec(cmd, function (err) {
        if (err) return fatalError(err)
        torrentDone()
      }).unref()
    }

    if (argv.airplay) {
      var airplay = require('airplay-js')
      airplay.createBrowser()
        .on('deviceOn', function (device) {
          device.play(href, 0, function () {})
        })
        .start()
      // TODO: handle case where user closes airplay. do same thing as when VLC is closed
    }

    if (argv.chromecast) {
      var chromecasts = require('chromecasts')()
      chromecasts.on('update', function (player) {
        player.play(href)
      })
    }

    if (argv.xbmc) {
      var xbmc = require('nodebmc')
      new xbmc.Browser()
        .on('deviceOn', function (device) {
          device.play(href, function () {})
        })
    }
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }
    process.stdin.resume()
    drawTorrent(torrent)
  }
}

function runSearch (input_query) {
  if (!input_query) {
    (function showUsage () {
      var pathToBin = path.join(
        path.relative(
          process.cwd(),
          path.dirname(process.argv[1])
        ),
        path.basename(process.argv[1])
      )

      clivas.line('{green:Usage: }')
      clivas.line('{green: ' + process.argv[0] + ' ' + pathToBin + ' "query"' + '}')
    })()
  } else {
    process.stdout.write(new Buffer('G1tIG1sySg==', 'base64')) // clear for drawing
    clivas.line('Searching for {green:\'' + input_query + '\'}...')
    search(input_query).then(function (search_results) {
      clivas.clear()
      clivas.line('\n{bold: Search Results for {green: \'' + input_query + '\' } }\n')
      choices('Select your torrent (by number)', search_results.slice(0, 9)
        .filter(function (r) {
          if (r.torrent || r.magnet) { return true }
          return false
        })
        .map(function (r) {
          return r.name + ' [' + r.size + ' / ' + r.files + ' files] ' + r.seeds + '/' + r.leech
        }),
        function (index) {
          if (index === null) {
            return
          }
          if (/^magnet:/.test(search_results[index].magnet)) {
            clivas.clear()
            runDownload(search_results[index].magnet)
          } else {
            return
          }
        })
    })
  }
}

function runSeed (input) {
  if (path.extname(input).toLowerCase() === '.torrent' || /^magnet:/.test(input)) {
    // `webtorrent seed` is meant for creating a new torrent based on a file or folder
    // of content, not a torrent id (.torrent or a magnet uri). If this command is used
    // incorrectly, let's just do the right thing.
    runDownload(input)
    return
  }

  client = new WebTorrent({
    blocklist: argv.blocklist
  })
  .on('error', fatalError)

  client.seed(input)

  client.on('torrent', function (torrent) {
    if (argv.quiet) console.log(torrent.magnetURI)
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }
    process.stdin.resume()
    drawTorrent(torrent)
  })
}

var drawInterval, cli
var commandMode = false
var blockDraw = false
var cliInput = false

function drawTorrent (torrent) {
  process.stdin.on('data', function (chunk) {
    blockDraw = true

    if (!cliInput && (chunk === 'q' || chunk === 's')) {
      cliInput = true
      process.stdin.setRawMode(false)
      process.stdin.pause()
      torrent.pause()
      cli = inquirer.prompt([{
        type: 'input',
        name: 'shouldQuit',
        validate: function (input) {
          if (input === 'Y' || input === 'y' || input === 'N' || input === 'n') {
            // Pass the return value in the done callback
            return true
          } else {
            return "Incorrect input. Please enter 'Y' or 'n'"
          }
        },
        filter: function (input) {
          if (input === 'Y' || input === 'y') return true
          else if (input === 'N' || input === 'n') return false
        },
        message: 'Do you wish to quit? (Y/n)'
      }], function (answers) {
        if (answers.shouldQuit) {
          torrent.resume()
          gracefulExit()
        } else {
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(true)
          }
          process.stdin.resume()
          torrent.resume()
          blockDraw = false
          cliInput = false
        }
      })

      cli.rl.on('SIGINT', function () {
        return gracefulExit()
      })
    } else if (!cliInput && (chunk === 'p')) {
      cliInput = true
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
      }
      process.stdin.pause()
      torrent.pause()
      clivas.line('{green: torrent paused}')

      cli = inquirer.prompt([{
        type: 'input',
        name: 'inputChoice',
        validate: function (input) {
          if (input === 'r' || input === 'q') {
            // Pass the return value in the done callback
            return true
          } else {
            return "Incorrect input. Please enter 'r' or 'q'"
          }
        },
        filter: function (input) {
          if (input === 'r') return 'resume'
          else if (input === 'q') return 'quit'
        },
        message: 'Do you want to (r)esume or (q)uit seeding?'
      }], function (answers) {
        if (answers.inputChoice === 'quit') {
          torrent.resume()
          gracefulExit()
        } else {
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(true)
          }
          process.stdin.resume()
          torrent.resume()
          blockDraw = false
          cliInput = false
        }
      })

      cli.rl.on('SIGINT', function () {
        return gracefulExit()
      })
    } else if (!cliInput) {
      setTimeout(function () {
        blockDraw = false
        draw()
      }, 100)
    }
  })

  if (!argv.quiet) {
    process.stdout.write(new Buffer('G1tIG1sySg==', 'base64')) // clear for drawing
    process.stdin.setEncoding('utf8')
    drawInterval = setInterval(draw, 500)
    drawInterval.unref()
  }

  function draw () {
    if (!blockDraw) {
      var hotswaps = 0
      torrent.on('hotswap', function () {
        hotswaps += 1
      })

      var unchoked = torrent.swarm.wires.filter(function (wire) {
        return !wire.peerChoking
      })
      var linesRemaining = clivas.height
      var peerslisted = 0
      var speed = torrent.downloadSpeed()
      var estimate = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()

      clivas.clear()

      if (playerName) {
        clivas.line('{green:Streaming to} {bold:' + playerName + '}')
        linesRemaining -= 1
      }

      if (server) {
        clivas.line('{green:server running at} {bold:' + href + '}')
        linesRemaining -= 1
      }

      if (argv.out) {
        clivas.line('{green:downloading to} {bold:' + argv.out + '}')
        linesRemaining -= 1
      }

      var seeding = torrent.done

      if (!seeding) clivas.line('')
      clivas.line(
        '{green:' + (seeding ? 'seeding' : 'downloading') + ':} ' +
        '{bold:' + torrent.name + '}'
      )
      if (seeding) {
        clivas.line('{green:info hash:} ' + torrent.infoHash)
        linesRemaining -= 1
      }
      clivas.line(
        '{green:speed: }{bold:' + prettyBytes(speed) + '/s}  ' +
        '{green:downloaded:} {bold:' + prettyBytes(torrent.downloaded) + '}' +
        '/{bold:' + prettyBytes(torrent.length) + '}  ' +
        '{green:uploaded:} {bold:' + prettyBytes(torrent.uploaded) + '}  ' +
        '{green:peers:} {bold:' + unchoked.length + '/' + torrent.swarm.wires.length + '}  ' +
        '{green:hotswaps:} {bold:' + hotswaps + '}'
      )
      clivas.line(
        '{green:time remaining:} {bold:' + estimate + ' remaining}  ' +
        '{green:total time:} {bold:' + getRuntime() + 's}  ' +
        '{green:queued peers:} {bold:' + torrent.swarm.numQueued + '}  ' +
        '{green:blocked:} {bold:' + torrent.numBlockedPeers + '}'
      )
      clivas.line('{80:}')
      linesRemaining -= 5

      torrent.swarm.wires.every(function (wire) {
        var progress = '?'
        if (torrent.length) {
          var bits = 0
          var piececount = Math.ceil(torrent.length / torrent.pieceLength)
          for (var i = 0; i < piececount; i++) {
            if (wire.peerPieces.get(i)) {
              bits++
            }
          }
          progress = bits === piececount ? 'S' : Math.floor(100 * bits / piececount) + '%'
        }
        var tags = []

        if (wire.peerChoking) tags.push('choked')
        if (wire.requests.length > 0) tags.push(wire.requests.length + ' reqs')

        var reqStats = argv.verbose
          ? wire.requests.map(function (req) { return req.piece })
          : []

        clivas.line(
          '{3:%s} {25+magenta:%s} {10:%s} {12+cyan:%s/s} {12+red:%s/s} {15+grey:%s}' +
          '{10+grey:%s}',
          progress,
          wire.remoteAddress
            ? (wire.remoteAddress + ':' + wire.remotePort)
            : 'Unknown',
          prettyBytes(wire.downloaded),
          prettyBytes(wire.downloadSpeed()),
          prettyBytes(wire.uploadSpeed()),
          tags.join(', '),
          reqStats.join(' ')
        )
        peerslisted++
        return linesRemaining - peerslisted > 4
      })
      linesRemaining -= peerslisted

      if (torrent.swarm.wires.length > peerslisted) {
        clivas.line('{80:}')
        clivas.line('... and %s more', torrent.swarm.wires.length - peerslisted)
      }

      clivas.line('{80:}')

      if (commandMode) {
        clivas.line('{green:command :}')
      }
      clivas.flush(true)
    }
  }
}

function torrentDone () {
  if (argv['on-done']) cp.exec(argv['on-done']).unref()
  if (!playerName && !serving && argv.out) gracefulExit()
}

function fatalError (err) {
  clivas.line('{red:Error:} ' + (err.message || err))
  process.exit(1)
}

function errorAndExit (err) {
  clivas.line('{red:Error:} ' + (err.message || err))
  expectedError = true
  process.exit(1)
}

function gracefulExit () {
  process.removeListener('SIGINT', gracefulExit)
  process.removeListener('SIGTERM', gracefulExit)
  clearInterval(drawInterval)

  clivas.line('\n{green:webtorrent is gracefully exiting...}')

  if (client) {
    if (argv['on-exit']) cp.exec(argv['on-exit']).unref()
    client.destroy(function (err) {
      if (err) return fatalError(err)
      // Quit after 1 second. This shouldn't be necessary, node never quits even though
      // there's nothing in the event loop when `wrtc` (webtorrent-hybrid) is used :(
      setTimeout(function () { process.exit(0) }, 1000).unref()
    })
  }
}
