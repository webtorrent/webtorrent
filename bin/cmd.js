#!/usr/bin/env node

var airplay = require('airplay-js')
var chalk = require('chalk')
var chromecast = require('chromecast-js')
var clivas = require('clivas')
var cp = require('child_process')
var fs = require('fs')
var minimist = require('minimist')
var moment = require('moment')
var networkAddress = require('network-address')
var numeral = require('numeral')
var path = require('path')
var WebTorrent = require('../')

function usage (noLogo) {
  if (!noLogo) {
    var logo = fs.readFileSync(path.join(__dirname, 'ascii-logo.txt'), 'utf8')
    logo.split('\n').forEach(function (line) {
      console.log(chalk.bold(line.substring(0, 20) + chalk.red(line.substring(20))))
    })
  }
  console.log('Usage: webtorrent [OPTIONS] <torrent_id>')
  console.log('')
  clivas.line('{bold:torrent_id} can be any of the following:')
  console.log('  * magnet uri (string)')
  console.log('  * http/https url to .torrent file')
  console.log('  * filesystem path to .torrent file')
  console.log('  * info hash (as hex string)')
  console.log('')
  clivas.line('{bold:OPTIONS:}')
  console.log('  --airplay               autoplay on Apple TV (AirPlay)')
  console.log('  --chromecast            autoplay on Chromecast')
  console.log('  --vlc                   autoplay in VLC')
  console.log('  --mplayer               autoplay in MPlayer')
  console.log('  --omx [jack]            autoplay in omx (jack=local|hdmi)')
  console.log('')
  console.log('  -p, --port [number]     change the http port [default: 8000]')
  console.log('  -b, --blocklist [path]  use the specified blocklist')
  console.log('  -t, --subtitles [file]  load subtitles file')
  console.log('  -l, --list              list available files in torrent')
  console.log('  -n, --no-quit           do not quit webtorrent on vlc exit')
  console.log('  -r, --remove            remove downloaded files on exit')
  console.log('  -q, --quiet             silence stdout')
  console.log('  -h, --help              display this help message')
  console.log('  -v, --version           print the current version')
}

var argv = minimist(process.argv.slice(2), {
  alias: {
    p: 'port',
    b: 'blocklist',
    t: 'subtitles',
    l: 'list',
    n: 'no-quit',
    r: 'remove',
    q: 'quiet',
    h: 'help',
    v: 'version'
  },
  boolean: [ // options that are always boolean
    'vlc',
    'mplayer',
    'airplay',
    'chromecast',
    'list',
    'no-quit',
    'remove',
    'quiet',
    'help',
    'version'
  ],
  default: {
    port: 8000
  }
})

if (argv.help) {
  usage()
  process.exit(0)
}

if (argv.version) {
  console.log(require('../package.json').version)
  process.exit(0)
}

var torrentId = argv._[0]
if (!torrentId) {
  error('Please specify a torrent to download')
  usage(true)
  process.exit(1)
}

if (process.env.DEBUG) {
  argv.quiet = argv.q = true
}

var VLC_ARGS = process.env.DEBUG
  ? '-q --video-on-top --play-and-exit'
  : '--video-on-top --play-and-exit --extraintf=http:logger --verbose=2 --file-logging --logfile=vlc-log.txt'
var OMX_EXEC = 'omxplayer -r -o ' + (typeof argv.omx === 'string')
  ? argv.omx
  : 'hdmi'
var MPLAYER_EXEC = 'mplayer -ontop -really-quiet -noidx -loop 0'

if (argv.subtitles) {
  VLC_ARGS += ' --sub-file=' + argv.subtitles
  OMX_EXEC += ' --subtitles ' + argv.subtitles
  MPLAYER_EXEC += ' -sub ' + argv.subtitles
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
  list: argv.list,
  blocklist: argv.blocklist, // TODO: handle this option in bittorrent-client
  port: argv.port
})
.on('error', errorAndExit)

if (argv.remove) {
  process.on('SIGINT', remove)
  process.on('SIGTERM', remove)
}

function remove (cb) {
  process.removeListener('SIGINT', remove)
  process.removeListener('SIGTERM', remove)
  client.destroy(cb)
}

client.add(torrentId, {
  remove: argv.remove
})

client.on('addTorrent', function (torrent) {
  if (torrent.metadata || argv.quiet || argv.list) return
  updateMetadata()
  torrent.swarm.on('wire', updateMetadata)

  torrent.on('metadata', function () {
    torrent.swarm.removeListener('wire', updateMetadata)
  })

  function updateMetadata () {
    var numPeers = torrent.swarm.numPeers
    clivas.clear()
    clivas.line('{green:fetching torrent metadata from} {bold:'+numPeers+'} {green:peers}')
  }
})

client.on('torrent', function (torrent) {
  if (client.listening) onTorrent(torrent)
  else client.on('listening', onTorrent)
})

var filename, swarm, wires

function onTorrent (torrent) {
  filename = torrent.name
  swarm = torrent.swarm
  wires = torrent.swarm.wires

  torrent.on('verifying', function (data) {
    if (argv.quiet || argv.list) return
    clivas.clear()
    clivas.line(
      '{green:verifying existing torrent} {bold:'+Math.floor(data.percentDone)+'%} ' +
      '({bold:'+Math.floor(data.percentVerified)+'%} {green:passed verification})'
    )
  })

  torrent.on('done', function () {
    if (argv.list) return

    if (!argv.quiet) {
      // TODO: expose this data from bittorrent-swarm
      var numActiveWires = torrent.swarm.wires.reduce(function (num, wire) {
        return num + (wire.downloaded > 0)
      }, 0)
      clivas.line('torrent downloaded {green:successfully} from {bold:'+numActiveWires+'/'+torrent.swarm.wires.length+'} {green:peers} in {bold:'+getRuntime()+'s}!')
    }

    if (argv.remove) {
      remove(maybeExit)
    } else {
      maybeExit()
    }

    function maybeExit () {
      if (!client.server) {
        process.exit(0)
      }
    }
  })

  torrent.on('ready', function onTorrentReady () {
    if (argv.list) {
      torrent.files.forEach(function (file, i) {
        clivas.line('{3+bold:' + i + '} : {magenta:' + file.name + '}')
      })
      process.exit(0)
    }

    var href
    if (client.server) {
      href = 'http://' + networkAddress() + ':' + client.server.address().port + '/'
    }

    var cmd, player
    var playerName = argv.vlc ? 'vlc' : argv.omx ? 'omx' : argv.mplayer ? 'mplayer' : ''
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
      cmd = 'vlc ' + href + ' ' + VLC_ARGS +
        ' || /Applications/VLC.app/Contents/MacOS/VLC ' + href + ' ' + VLC_ARGS
    } else if (argv.omx) {
      cmd = OMX_EXEC + ' ' + href
    } else if (argv.mplayer) {
      cmd = MPLAYER_EXEC + ' ' + href
    }

    if (cmd) {
      player = cp.exec(cmd, errorAndExit)
        .on('exit', function () {
          if (!argv['no-quit']) process.exit(0)
        })
    }

    if (argv.airplay) {
      airplay.createBrowser()
        .on('deviceOn', function (device) {
          device.play(href, 0, function () {})
        })
        .start()
      // TODO: handle case where user closes airplay. do same thing as when VLC is closed
    }

    if (argv.chromecast) {
      ;(new chromecast.Browser())
        .on('deviceOn', function (device) {
          device.connect()
          device.on('connected', function () {
            device.play(href)
          })
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
      return numeral(num).format('0.0b')
    }

    function draw () {
      var unchoked = wires.filter(active)
      var linesremaining = clivas.height
      var peerslisted = 0
      var speed = swarm.downloadSpeed()
      var estimatedSecondsRemaining = Math.max(0, torrent.length - swarm.downloaded) / (speed > 0 ? speed : -1)
      var estimate = moment.duration(estimatedSecondsRemaining, 'seconds').humanize()

      clivas.clear()

      if (argv.airplay) {
        clivas.line('{green:Streaming via} {bold:AirPlay}')
      }
      if (argv.chromecast) {
        clivas.line('{green:Streaming via} {bold:Chromecast}')
      }
      if (playerName) {
        clivas.line(
          '{green:open} {bold:' + playerName + '} {green:and enter} {bold:' + href + '} ' +
          '{green:as the network address}'
        )
      } else {
        clivas.line(
          '{green:server running at} {bold:' + href + '} '
        )
      }

      clivas.line('')
      clivas.line(
        '{yellow:info} {green:streaming} {bold:' + filename + '} {green:-} ' +
        '{bold:' + bytes(speed) + '/s} {green:from} ' +
        '{bold:' + unchoked.length + '/' + wires.length + '} {green:peers}'
      )
      clivas.line(
        '{yellow:info} {green:downloaded} {bold:' + bytes(swarm.downloaded) + '} ' +
        '{green:out of} {bold:' + bytes(torrent.length) + '} ' +
        '{green:and uploaded }{bold:' + bytes(swarm.uploaded) + '} ' +
        '{green:in }{bold:' + getRuntime() + 's} ' +
        '{green:with} {bold:' + hotswaps + '} {green:hotswaps}'
      )
      clivas.line(
        '{yellow:info} {green:estimating} {bold:' + estimate + '} {green:remaining}; ' +
        '{green:peer queue size is} {bold:' + swarm.numQueued + '}'
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
  })
}
