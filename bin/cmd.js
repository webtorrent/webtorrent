#!/usr/bin/env node

var clivas = require('clivas')
var cp = require('child_process')
var fs = require('fs')
var minimist = require('minimist')
var moment = require('moment')
var networkAddress = require('network-address')
var path = require('path')
var prettysize = require('prettysize')
var WebTorrent = require('../')

process.title = 'WebTorrent'

process.on('exit', function (code) {
  if (code !== 0) {
    clivas.line('{red:ERROR:} If you think this is a bug in webtorrent, report it!')
    console.log('=====>                                               <=====')
    console.log('=====>  https://github.com/feross/webtorrent/issues  <=====')
    console.log('=====>                                               <=====')
  }
})

var argv = minimist(process.argv.slice(2), {
  alias: {
    p: 'port',
    b: 'blocklist',
    t: 'subtitles',
    l: 'list',
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
    'list',
    'quiet',
    'help',
    'version'
  ],
  default: {
    port: 9000
  }
})

if (argv.version) {
  console.log(require('../package.json').version)
  return done()
}

var torrentId = argv._[0]

if (argv.help || !torrentId) {
  fs.readFileSync(path.join(__dirname, 'ascii-logo.txt'), 'utf8')
    .split('\n')
    .forEach(function (line) {
      clivas.line('{bold:' + line.substring(0, 20) + '}{red:' + line.substring(20) + '}')
    })

  console.log(function () {/*
  Usage:
      webtorrent <options> <torrent-uri>

      Download the torrent from:
          * magnet uri
          * http url to .torrent file
          * filesystem path to .torrent file
          * info hash (hex string)

  Streaming options:
      --airplay               Apple TV
      --chromecast            Chromecast
      --mplayer               MPlayer
      --mpv                   MPV
      --omx [jack]            omx [default: hdmi]
      --vlc                   VLC
      --xbmc                  XBMC
      --stdout                standard out (implies --quiet)

  Options:
      -o, --out [path]        set download destination [default: /tmp/webtorrent]
      -l, --list              list files in torrent (with indexes)
      -i, --index [index]     stream a particular file from torrent (by index)

      -p, --port [number]     change the http port [default: 9000]
      -b, --blocklist [path]  use the specified blocklist
      -t, --subtitles [file]  load subtitles file

      -q, --quiet             don't show UI on stdout
      -v, --version           print the current version

  Please report bugs!  https://github.com/feross/webtorrent/issues

    */}.toString().split(/\n/).slice(1, -1).join('\n'))
  return done()
}

if (process.env.DEBUG || argv.stdout) {
  argv.quiet = argv.q = true
}

var VLC_ARGS = process.env.DEBUG
  ? '-q --play-and-exit'
  : '--play-and-exit --extraintf=http:logger --verbose=2 --file-logging --logfile=vlc-log.txt'
var MPLAYER_EXEC = 'mplayer -ontop -really-quiet -noidx -loop 0'
var MPV_EXEC = 'mpv --ontop --really-quiet --loop=no'
var OMX_EXEC = 'omxplayer -r -o ' + (typeof argv.omx === 'string')
  ? argv.omx
  : 'hdmi'

if (argv.subtitles) {
  VLC_ARGS += ' --sub-file=' + argv.subtitles
  MPLAYER_EXEC += ' -sub ' + argv.subtitles
  MPV_EXEC += ' --sub-file=' + argv.subtitles
  OMX_EXEC += ' --subtitles ' + argv.subtitles
}

function error (err) {
  clivas.line('{red:ERROR:} ' + (err.message || err))
}

function errorAndExit (err) {
  error(err)
  process.exit(1)
}

var started = Date.now()
function getRuntime () {
  return Math.floor((Date.now() - started) / 1000)
}

var client = new WebTorrent({
  blocklist: argv.blocklist
})
.on('error', errorAndExit)

if (!argv.out) { // If no output file has been specified
  process.on('SIGINT', remove)
  process.on('SIGTERM', remove)
}

function remove (cb) {
  process.removeListener('SIGINT', remove)
  process.removeListener('SIGTERM', remove)
  client.destroy(cb)
}

var torrent = client.add(torrentId, (argv.out ? { tmp: argv.out } : {}))

torrent.on('infoHash', function () {
  function updateMetadata () {
    var numPeers = torrent.swarm.numPeers
    clivas.clear()
    clivas.line('{green:fetching torrent metadata from} {bold:'+numPeers+'} {green:peers}')
  }

  if (!argv.quiet && !argv.list) {
    torrent.swarm.on('wire', updateMetadata)
    torrent.on('metadata', function () {
      torrent.swarm.removeListener('wire', updateMetadata)
    })
    updateMetadata()
  }
})

var filename, swarm, wires, server, serving

if (argv.list) torrent.once('ready', onReady)
else {
  server = torrent.createServer()
  server.listen(argv.port, function () {
    if (torrent.ready) onReady()
    else torrent.once('ready', onReady)
  }).once('connection', function () {
    serving = true
  })
}

function done () {
  if (!serving) {
    process.exit(0)
  }
}

function onReady () {
  filename = torrent.name
  swarm = torrent.swarm
  wires = torrent.swarm.wires

  if (argv.list) {
    torrent.files.forEach(function (file, i) {
      clivas.line('{3+bold:' + i + '} : {magenta:' + file.name + '}')
    })
    return done()
  }

  torrent.on('verifying', function (data) {
    if (argv.quiet) return
    clivas.clear()
    clivas.line(
      '{green:verifying existing torrent} {bold:'+Math.floor(data.percentDone)+'%} ' +
      '({bold:'+Math.floor(data.percentVerified)+'%} {green:passed verification})'
    )
  })

  torrent.on('done', function () {
    if (!argv.quiet) {
      // TODO: expose this data from bittorrent-swarm
      var numActiveWires = torrent.swarm.wires.reduce(function (num, wire) {
        return num + (wire.downloaded > 0)
      }, 0)
      clivas.line('torrent downloaded {green:successfully} from {bold:'+numActiveWires+'/'+torrent.swarm.wires.length+'} {green:peers} in {bold:'+getRuntime()+'s}!')
    }
    done()
  })

  var cmd, player
  var playerName = argv.airplay ? 'Airplay'
    : argv.chromecast ? 'Chromecast'
    : argv.xbmc ? 'XBMC'
    : argv.vlc ? 'VLC'
    : argv.mplayer ? 'MPlayer'
    : argv.mpv ? 'mpv'
    : argv.omx ? 'OMXPlayer'
    : null

  // if no index specified, use largest file
  var index = (typeof argv.index === 'number')
    ? argv.index
    : torrent.files.indexOf(torrent.files.reduce(function (a, b) {
      return a.length > b.length ? a : b
    }))
  var href = 'http://' + networkAddress() + ':' + argv.port + '/' + index

  if (playerName) torrent.files[index].select()
  if (argv.stdout) torrent.files[index].createReadStream().pipe(process.stdout)

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
      cp.execFile(vlcPath, VLC_ARGS, errorAndExit)
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
    player = cp.exec(cmd, errorAndExit)
      .on('exit', function () {
        done()
      })
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

  var hotswaps = 0
  torrent.on('hotswap', function () {
    hotswaps += 1
  })

  if (!argv.quiet) {
    process.stdout.write(new Buffer('G1tIG1sySg==', 'base64')) // clear for drawing

    setInterval(draw, 500)
  }

  function active (wire) {
    return !wire.peerChoking
  }

  function bytes (num) {
    return prettysize(num)
  }

  function draw () {
    var unchoked = wires.filter(active)
    var linesremaining = clivas.height
    var peerslisted = 0
    var speed = swarm.downloadSpeed()
    var estimatedSecondsRemaining = Math.max(0, torrent.length - swarm.downloaded) / (speed > 0 ? speed : -1)
    var estimate = moment.duration(estimatedSecondsRemaining, 'seconds').humanize()

    clivas.clear()

    if (playerName)
      clivas.line('{green:Streaming to} {bold:' + playerName + '}')
    if (server)
      clivas.line('{green:server running at} {bold:' + href + '}')

    clivas.line('')
    clivas.line('{green:downloading:} {bold:' + filename + '}')
    clivas.line(
      '{green:speed: }{bold:' + bytes(speed) + '/s}  ' +
      '{green:downloaded:} {bold:' + bytes(swarm.downloaded) + '}' +
      '/{bold:' + bytes(torrent.length) + '}  ' +
      '{green:uploaded:} {bold:' + bytes(swarm.uploaded) + '}  ' +
      '{green:peers:} {bold:' + unchoked.length + '/' + wires.length + '}  ' +
      '{green:hotswaps:} {bold:' + hotswaps + '}'
    )
    clivas.line(
      '{green:time remaining:} {bold:' + estimate + ' remaining}  ' +
      '{green:total time:} {bold:' + getRuntime() + 's}  ' +
      '{green:queued peers:} {bold:' + swarm.numQueued + '}  ' +
      '{green:blocked:} {bold:' + torrent.numBlockedPeers + '}'
    )
    clivas.line('{80:}')
    linesremaining -= 8

    wires.every(function (wire) {
      var tags = []
      if (wire.peerChoking) tags.push('choked')
      clivas.line(
        '{25+magenta:' + wire.remoteAddress + '} {10:'+bytes(wire.downloaded)+'} ' +
        '{10+cyan:' + bytes(wire.downloadSpeed()) + '/s} ' +
        '{15+grey:' + tags.join(', ') + '}'
      )
      peerslisted++
      return linesremaining - peerslisted > 4
    })
    linesremaining -= peerslisted

    if (wires.length > peerslisted) {
      clivas.line('{80:}')
      clivas.line('... and '+(wires.length - peerslisted)+' more')
    }

    clivas.line('{80:}')
    clivas.flush(true)
  }
}
