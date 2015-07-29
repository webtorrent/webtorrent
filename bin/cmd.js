#!/usr/bin/env node

var clivas = require('clivas')
var cp = require('child_process')
var createTorrent = require('create-torrent')
var fs = require('fs')
var inquirer = require('inquirer')
var minimist = require('minimist')
var moment = require('moment')
var networkAddress = require('network-address')
var parseTorrent = require('parse-torrent')
var path = require('path')
var prettyBytes = require('pretty-bytes')
var Storage = require('../lib/storage')
var WebTorrent = require('../')
var zeroFill = require('zero-fill')

process.title = 'WebTorrent'

process.on('exit', function (code) {
  if (code !== 0) {
    clivas.line('{red:ERROR:} If you think this is a bug in WebTorrent, report it!\n')
    console.log('=====>                                               <=====')
    console.log('=====>  https://github.com/feross/webtorrent/issues  <=====')
    console.log('=====>                                               <=====')
    clivas.line(
      '\n{green:DEBUG INFO:} ' +
      'node ' + process.version + ', ' +
      process.platform + ' ' + process.arch + ', ' +
      'webtorrent ' + require('../package.json').version + ', ' +
      'exit ' + code + '\n'
    )
  }
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
    d: 'done',
    e: 'exit',
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
    var stats = fs.lstatSync(filename)
    if (!stats.isFile()) {
      errorAndExit('Your script ' + filename + ' is not exist')
    }
    // check if the script has executable permission
    if (!(1&parseInt((stats.mode & parseInt('777', 8)).toString(8)[0]))) {
      errorAndExit(filename + ' don\'t have executable permission')
    }
    return fs.realpathSync(filename)
  } catch (err) {
    errorAndExit(err)
  }
}

if (argv.done) {
  var doneScript = checkPermission(argv.done)
}
if (argv.exit) {
  var exitScript = checkPermission(argv.exit)
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

Options (all):
    -o, --out [path]        set download destination [default: /tmp/webtorrent]
    -s, --select            select individual file in torrent (by index)
    -i, --index [index]     stream a particular file from torrent (by index)
    -p, --port [number]     change the http port [default: 8000]
    -b, --blocklist [path]  load blocklist file/http url
    -t, --subtitles [file]  load subtitles file
    -d, --done [script]     run script after download done
    -e, --exit [script]     run script during exiting
    -q, --quiet             don't show UI on stdout
    -v, --version           print the current version
    --verbose               show detailed torrent protocol info
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
      errorAndExit(err)
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
  client = new WebTorrent({
    blocklist: argv.blocklist
  })
  .on('error', errorAndExit)

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
  server.listen(argv.port, function () {
    if (torrent.ready) onReady()
    else torrent.once('ready', onReady)
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
        if (torrent.files.length === 0) errorAndExit('No files in the torrent')

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
      ? 'http://' + networkAddress() + ':' + argv.port + '/' + index
      : 'http://localhost:' + argv.port + '/' + index

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
          if (err) return errorAndExit(err)
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
        if (err) return errorAndExit(err)
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
      var chromecast = require('chromecast-js')
      new chromecast.Browser()
        .on('deviceOn', function (device) {
          device.connect()
          device.on('connected', function () {
            device.play(href)
          })
        })
    }

    if (argv.xbmc) {
      var xbmc = require('nodebmc')
      new xbmc.Browser()
        .on('deviceOn', function (device) {
          device.play(href, function () {})
        })
    }

    drawTorrent(torrent)
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
  .on('error', errorAndExit)

  client.seed(input)

  client.on('torrent', function (torrent) {
    if (argv.quiet) console.log(torrent.magnetURI)
    drawTorrent(torrent)
  })
}

var drawInterval
function drawTorrent (torrent) {
  if (!argv.quiet) {
    process.stdout.write(new Buffer('G1tIG1sySg==', 'base64')) // clear for drawing
    drawInterval = setInterval(draw, 500)
    drawInterval.unref()
  }

  function draw () {
    var hotswaps = 0
    torrent.on('hotswap', function () {
      hotswaps += 1
    })

    var unchoked = torrent.swarm.wires.filter(function (wire) {
      return !wire.peerChoking
    })
    var linesRemaining = clivas.height
    var peerslisted = 0
    var speed = torrent.swarm.downloadSpeed()
    var estimatedSecondsRemaining =
      Math.max(0, torrent.length - torrent.swarm.downloaded) / (speed > 0 ? speed : -1)
    var estimate = moment.duration(estimatedSecondsRemaining, 'seconds').humanize()

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

    var seeding = torrent.storage.done

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
      '{green:downloaded:} {bold:' + prettyBytes(torrent.swarm.downloaded) + '}' +
      '/{bold:' + prettyBytes(torrent.length) + '}  ' +
      '{green:uploaded:} {bold:' + prettyBytes(torrent.swarm.uploaded) + '}  ' +
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

    if (argv.verbose) {
      var pieces = torrent.storage.pieces
      var memoryUsage = 0
      for (var i = 0; i < pieces.length; i++) {
        var piece = pieces[i]
        if (piece.buffer) memoryUsage += piece.buffer.length
        if (piece.verified || (piece.blocksWritten === 0 && !piece.blocks[0])) continue
        var bar = ''
        for (var j = 0; j < piece.blocks.length; j++) {
          switch (piece.blocks[j]) {
            case Storage.BLOCK_BLANK:
              bar += '{red:█}'
              break
            case Storage.BLOCK_RESERVED:
              bar += '{blue:█}'
              break
            case Storage.BLOCK_WRITTEN:
              bar += '{green:█}'
              break
          }
        }
        clivas.line('{4+cyan:' + i + '} ' + bar)
        linesRemaining -= 1
      }
      clivas.line(
        '{red:memory usage:} {bold:' + prettyBytes(memoryUsage) + '}'
      )
      clivas.line('{80:}')
      linesRemaining -= 2
    }

    torrent.swarm.wires.every(function (wire) {
      var progress = '?'
      if (torrent.parsedTorrent) {
        var bits = 0
        var piececount = Math.ceil(torrent.parsedTorrent.length / torrent.parsedTorrent.pieceLength)
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
    clivas.flush(true)
  }
}
function getTorrentInfo () {
  var params = []
  if (client) {
    var torrent = client.torrents[0]
    if (torrent) {
      var torrentFilename = path.join(torrent.storage.path, torrent.infoHash) + '.torrent'

      try {
        fs.writeFileSync(torrentFilename, torrent.torrentFile)
      } catch(err) {
        torrentFilename = ''
      }

      params.push(torrentFilename)
      params.push(path.join(torrent.storage.path, torrent.name))
      params.push(torrent.magnetURI)
    }
  }
  return params
}
function torrentDone () {
  if (doneScript) cp.execFile(doneScript, getTorrentInfo()).unref()
  if (!playerName && !serving && argv.out) gracefulExit()
}

function errorAndExit (err) {
  clivas.line('{red:ERROR:} ' + (err.message || err))
  process.exit(1)
}

function gracefulExit () {
  process.removeListener('SIGINT', gracefulExit)
  process.removeListener('SIGTERM', gracefulExit)

  clearInterval(drawInterval)

  if (client) {
    // destroying can take a while, so print a message to the user
    clivas.line('\n{green:webtorrent is gracefully exiting...}')

    if (exitScript) cp.execFile(exitScript, getTorrentInfo()).unref()
    client.destroy(function (err) {
      if (err) return errorAndExit(err)

      // Quit after 1 second. This shouldn't be necessary, node never quits even though
      // there's nothing in the event loop when `wrtc` (webtorrent-hybrid) is used :(
      setTimeout(function () { process.exit(0) }, 1000).unref()
    })
  }
}
