#!/usr/bin/env node

// TODO: add terminal UI

var clivas = require('clivas')
var cp = require('child_process')
var fs = require('fs')
var minimist = require('minimist')
var os = require('os')
var path = require('path')
var WebTorrent = require('../')

var TMP = os.tmp

function usage () {
  console.log(fs.readFileSync(path.join(__dirname, 'ascii-logo.txt'), 'utf8'))
  console.log('Usage: webtorrent [magnet/torrent url] {OPTIONS}')
  console.log('')
  console.log('Options:')
  console.log('  --vlc            autoplay in vlc')
  console.log('  --mplayer        autoplay in mplayer')
  console.log('  --omx [jack]     autoplay in omx')
  console.log('')
  console.log('  -p, --port       change the http port                  [default: 9000]')
  console.log('  -l, --list       list available files in the torrent')
  console.log('  -t, --subtitles  load subtitles file')
  console.log('  -h, --help       display this help message')
  console.log('  -v, --version    print the current version')
  console.log('')
}

var argv = minimist(process.argv.slice(2))

var url = argv._[0]

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

if (!url) {
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

if (/^magnet:/.test(url)) {
  onTorrent(url)
} else {
  console.log('TODO: http and file system urls not supported yet')
  process.exit(1)
}

function onTorrent (torrent) {
  var manager = new WebTorrent(torrent, {

  })

  if (list) {
    // TODO
    manager.on('ready', function () {
      manager.files.forEach(function (file, i, files) {
        console.log(i, file.name)
      })
      process.exit(0)
    })
    return
  }

}

