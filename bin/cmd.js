#!/usr/bin/env node

// TODO: add terminal UI

var chalk = require('chalk')
var clivas = require('clivas')
var concat = require('concat-stream')
var cp = require('child_process')
var fs = require('fs')
var http = require('http')
var minimist = require('minimist')
var os = require('os')
var path = require('path')
var numeral = require('numeral')
var address = require('network-address')
var WebTorrent = require('../')

var TMP = os.tmp

function usage () {
  var logo = fs.readFileSync(path.join(__dirname, 'ascii-logo.txt'), 'utf8')
  logo.split('\n').forEach(function (line) {
    console.log(chalk.bold(line.substring(0, 20) + chalk.red(line.substring(20))))
  })
  console.log('Usage: webtorrent [torrentId] {OPTIONS}')
  console.log('')
  console.log(chalk.bold('torrentId') + ' can be any of the following:')
  console.log('  * magnet uri')
  console.log('  * path to .torrent file (filesystem path or http url)')
  console.log('  * info hash (as hex string)')
  console.log('')
  console.log(chalk.bold('OPTIONS:'))
  console.log('  --vlc            autoplay in vlc')
  console.log('  --mplayer        autoplay in mplayer')
  console.log('  --omx [jack]     autoplay in omx (jack=local|hdmi)')
  console.log('')
  console.log('  -p, --port       change the http port               [default: 9000]')
  console.log('  -l, --list       list available files in torrent')
  console.log('  -t, --subtitles  load subtitles file')
  console.log('  -h, --help       display this help message')
  console.log('  -v, --version    print the current version')
  console.log('')
}

var argv = minimist(process.argv.slice(2))

var torrentId = argv._[0]

var port = Number(argv.port || argv.p) || 9000
var list = argv.list || argv.l
var subtitles = argv.subtitles || argv.t

if (argv.help || argv.h) {
  usage()
  process.exit(0)
}

if (argv.version || argv.v) {
  console.log(require('../package.json').version)
  process.exit(0)
}

if (!torrentId) {
  usage()
  process.exit(0)
}

var VLC_ARGS = '-q --video-on-top --play-and-exit'
var OMX_EXEC = 'omxplayer -r -o ' + (typeof argv.omx === 'string')
  ? argv.omx + ' '
  : 'hdmi '
var MPLAYER_EXEC = 'mplayer -ontop -really-quiet -noidx -loop 0 '

if (subtitles) {
  VLC_ARGS += ' --sub-file=' + subtitles
  OMX_EXEC += ' --subtitles ' + subtitles
  MPLAYER_EXEC += ' -sub ' + subtitles
}

var client = new WebTorrent({
  list: list,
  quiet: true
})

client.on('error', function (err) {
  clivas.line('{red:error} ' + err)
})

client.add(torrentId, function (err, torrent) {
  if (err) {
    clivas.line('{red:error} ' + err)
    process.exit(1)
  }
  
  function updateMetadata () {
    if (torrent) {
      clivas.clear()
      clivas.line('{green:fetching torrent metadata from} {bold:'+torrent.swarm.numPeers+'} {green:peers}')
    }
  }

  if (!torrent.metadata && !argv.quiet && !list) {
    updateMetadata()
    torrent.swarm.on('wire', updateMetadata)
    
    client.once('torrent', function () {
      torrent.swarm.removeListener('wire', updateMetadata)
    })
  }
})

client.once('torrent', function (torrent) {
  if (list) {
    torrent.files.forEach(function (file, i) {
      clivas.line('{3+bold:'+i+'} : {magenta:'+file.name+'}');
    })
    
    process.exit(0)
  }
  
  var started = Date.now()
  var swarm = torrent.swarm
  var wires = swarm.wires

  var active = function(wire) {
    return !wire.peerChoking
  }

  var href = 'http://'+address()+':'+swarm.port+'/'
  //var filename = engine.server.index.name.split('/').pop().replace(/\{|\}/g, '')
  var filename = torrent.name

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
      var vlcPath = key['InstallDir'].value + path.sep + 'vlc'
      VLC_ARGS = VLC_ARGS.split(' ')
      VLC_ARGS.unshift(href)
      proc.execFile(vlcPath, VLC_ARGS)
    }
  } else {
    if (argv.vlc) proc.exec('vlc '+href+' '+VLC_ARGS+' || /Applications/VLC.app/Contents/MacOS/VLC '+href+' '+VLC_ARGS)
  }

  if (argv.omx) proc.exec(OMX_EXEC+' '+href)
  if (argv.mplayer) proc.exec(MPLAYER_EXEC+' '+href)

  var bytes = function (num) {
    return numeral(num).format('0.0b')
  }
  
  var getRuntime = function () {
    return Math.floor((Date.now() - started) / 1000)
  }

  process.stdout.write(new Buffer('G1tIG1sySg==', 'base64')); // clear for drawing

  var draw = function() {
    var unchoked = swarm.wires.filter(active)
    var runtime = getRuntime()
    var linesremaining = clivas.height
    var peerslisted = 0

    clivas.clear()
    clivas.line('{green:open} {bold:vlc} {green:and enter} {bold:'+href+'} {green:as the network address}')
    clivas.line('')
    clivas.line('{yellow:info} {green:streaming} {bold:'+filename+'} {green:-} {bold:'+bytes(swarm.downloadSpeed())+'/s} {green:from} {bold:'+unchoked.length +'/'+wires.length+'} {green:peers}    ')
    clivas.line('{yellow:info} {green:downloaded} {bold:'+bytes(swarm.downloaded)+'} {green:and uploaded }{bold:'+bytes(swarm.uploaded)+'} {green:in }{bold:'+runtime+'s}')
    clivas.line('{yellow:info} {green:peer queue size is} {bold:'+swarm.numQueued+'}     ')
    clivas.line('{80:}')
    linesremaining -= 8

    wires.every(function(wire) {
      var tags = []
      if (wire.peerChoking) tags.push('choked')
      clivas.line('{25+magenta:'+wire.remoteAddress+'} {10:'+bytes(wire.downloaded)+'} {10+cyan:'+bytes(wire.downloadSpeed())+'/s} {15+grey:'+tags.join(', ')+'}   ')
      peerslisted++
      return linesremaining-peerslisted > 4
    })
    linesremaining -= peerslisted

    if (wires.length > peerslisted) {
      clivas.line('{80:}')
      clivas.line('... and '+(wires.length-peerslisted)+' more     ')
    }

    clivas.line('{80:}')
    clivas.flush()
  }

  setInterval(draw, 500)
  draw()

  torrent.on('done', function () {
    clivas.line('torrent downloaded {green:successfully} from {bold:'+wires.length+'} {green:peers} in {bold:'+getRuntime()+'s}!')
    process.exit(0)
  })
  
  /*client.on('ready', function() {
    swarm.removeListener('wire', onmagnet)
    client.server.listen(argv.port || 8888)
  })*/
})
