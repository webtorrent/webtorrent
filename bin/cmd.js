#!/usr/bin/env node

// TODO: add terminal UI

var cp = require('child_process')
var minimist = require('minimist')
var os = require('os')
var WebTorrent = require('../')

var TMP = os.tmp

function usage () {
  console.log('Usage: webtorrent [magnet/torrent url] {OPTIONS}')
  console.log('')
  console.log('Options:')
  console.log('  -p, --port       change the http port')
  console.log('  -v, --vlc        autoplay in VLC')
  console.log('  -t, --subtitles  load subtitles file ')
  console.log('')
  console.log('  -h, --help  display this help message')
  console.log('  --version   print the current version')
  console.log('')
}

var argv = minimist(process.argv.slice(2))
var url = argv._[0]
var port = Number(argv.port || argv.p) || 9999
var useVLC = !!(argv.vlc || argv.v)
var subtitles = argv.subtitles || argv.t
var list = argv.list || argv.l

if (argv.help || argv.h) {
  usage()
  process.exit(0)
}

if (argv.version) {
  console.log(require('../package.json').version)
  process.exit(0)
}

if (!url) {
  usage()
  process.exit(1)
}

var VLC_ARGS = '-q --video-on-top --play-and-exit'
var OMX_EXEC = argv.jack ? 'omxplayer -r -o local ' : 'omxplayer -r -o hdmi '
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

