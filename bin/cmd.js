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

var manager = new WebTorrent(torrentId, {

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


// var numeral = require('numeral')
// var address = require('network-address')
// var path = require('path')

// var ontorrent = function(torrent) {
//   var hotswaps = 0;

//   engine.on('hotswap', function() {
//     hotswaps++;
//   });

//   var started = Date.now();
//   var wires = engine.swarm.wires;
//   var swarm = engine.swarm;

//   var active = function(wire) {
//     return !wire.peerChoking;
//   };

//   engine.on('uninterested', function() {
//     engine.swarm.pause();
//   });

//   engine.on('interested', function() {
//     engine.swarm.resume();
//   });

//   engine.server.on('listening', function() {
//     var href = 'http://'+address()+':'+engine.server.address().port+'/';
//     var filename = engine.server.index.name.split('/').pop().replace(/\{|\}/g, '');

//     if (argv.vlc && process.platform === 'win32') {
//       var registry = require('windows-no-runnable').registry;
//       var key;
//       if (process.arch === 'x64') {
//         try {
//           key = registry('HKLM/Software/Wow6432Node/VideoLAN/VLC');
//         } catch (e) {}
//       } else {
//         try {
//           key = registry('HKLM/Software/VideoLAN/VLC');
//         } catch (err) {}
//       }

//       if (key) {
//         var vlcPath = key['InstallDir'].value + path.sep + 'vlc';
//         VLC_ARGS = VLC_ARGS.split(' ');
//         VLC_ARGS.unshift(href);
//         proc.execFile(vlcPath, VLC_ARGS);
//       }
//     } else {
//       if (argv.vlc) proc.exec('vlc '+href+' '+VLC_ARGS+' || /Applications/VLC.app/Contents/MacOS/VLC '+href+' '+VLC_ARGS);
//     }

//     if (argv.omx) proc.exec(OMX_EXEC+' '+href);
//     if (argv.mplayer) proc.exec(MPLAYER_EXEC+' '+href);

//     var bytes = function(num) {
//       return numeral(num).format('0.0b');
//     };

//     process.stdout.write(new Buffer('G1tIG1sySg==', 'base64')); // clear for drawing

//     var draw = function() {
//       var unchoked = engine.swarm.wires.filter(active);
//       var runtime = Math.floor((Date.now() - started) / 1000);
//       var linesremaining = clivas.height;
//       var peerslisted = 0;

//       clivas.clear();
//       clivas.line('{green:open} {bold:vlc} {green:and enter} {bold:'+href+'} {green:as the network address}');
//       clivas.line('');
//       clivas.line('{yellow:info} {green:streaming} {bold:'+filename+'} {green:-} {bold:'+bytes(swarm.downloadSpeed())+'/s} {green:from} {bold:'+unchoked.length +'/'+wires.length+'} {green:peers}    ');
//       clivas.line('{yellow:info} {green:downloaded} {bold:'+bytes(swarm.downloaded)+'} {green:and uploaded }{bold:'+bytes(swarm.uploaded)+'} {green:in }{bold:'+runtime+'s} {green:with} {bold:'+hotswaps+'} {green:hotswaps}     ');
//       clivas.line('{yellow:info} {green:peer queue size is} {bold:'+swarm.queued+'}     ');
//       clivas.line('{80:}');
//       linesremaining -= 8;

//       wires.every(function(wire) {
//         var tags = [];
//         if (wire.peerChoking) tags.push('choked');
//         clivas.line('{25+magenta:'+wire.peerAddress+'} {10:'+bytes(wire.downloaded)+'} {10+cyan:'+bytes(wire.downloadSpeed())+'/s} {15+grey:'+tags.join(', ')+'}   ');
//         peerslisted++;
//         return linesremaining-peerslisted > 4;
//       });
//       linesremaining -= peerslisted;

//       if (wires.length > peerslisted) {
//         clivas.line('{80:}');
//         clivas.line('... and '+(wires.length-peerslisted)+' more     ');
//       }

//       clivas.line('{80:}');
//       clivas.flush();
//     };

//     setInterval(draw, 500);
//     draw();
//   });

//   engine.server.once('error', function() {
//     engine.server.listen(0);
//   });

//   var onmagnet = function() {
//     clivas.clear();
//     clivas.line('{green:fetching torrent metadata from} {bold:'+engine.swarm.wires.length+'} {green:peers}');
//   };

//   if (typeof torrent === 'string' && torrent.indexOf('magnet:') === 0 && !argv.quiet) {
//     onmagnet();
//     engine.swarm.on('wire', onmagnet);
//   }

//   engine.on('ready', function() {
//     engine.swarm.removeListener('wire', onmagnet);
//     engine.server.listen(argv.port || 8888);
//   });
// };


// /**
//  * WebTorrent App UI
//  */
// function App (torrentManager) {
//   var self = this
//   if (!(self instanceof App)) return new App(torrentManager)

//   self.torrentManager = torrentManager

//   // Add existing torrents
//   self.torrentManager.torrents.forEach(function (torrent) {
//     self.addTorrent(torrent)
//   })

//   self.torrentManager.on('error', function (err) {
//     console.error(err)
//     // TODO: Show error in UI somehow
//   })

//   window.torrentManager.on('addTorrent', function (torrent) {
//     self.addTorrent(torrent)
//   })
//   window.torrentManager.on('removeTorrent', function (torrent) {
//     self.removeTorrent(torrent)
//   })

//   self.initUI()
// }

// App.prototype.addTorrent = function (torrent) {
//   var self = this
//   var $torrent = $(TEMPLATE.TORRENT)
//   self.updateTorrentUI($torrent, torrent)

//   $torrent.on('click', function () {
//     self.downloadTorrentFile(torrent)
//   })

//   $('#torrents').append($torrent)
//   self.updateUI()
// }


// App.prototype.updateUI = function () {
//   var self = this

//   self.torrentManager.torrents.forEach(function (torrent) {
//     var $torrent = $('#torrent_' + torrent.infoHash)
//     self.updateTorrentUI($torrent, torrent)
//   })

//   $('.overall-stats .ratio span').text(self.torrentManager.ratio)
//   $('.overall-stats .uploadSpeed span').text(humanize.filesize(self.torrentManager.uploadSpeed()))
//   $('.overall-stats .downloadSpeed span').text(humanize.filesize(self.torrentManager.downloadSpeed()))

//   // Number of transfers
//   if (self.torrentManager.torrents.length === 1)
//     $('.numTransfers').text('1 transfer')
//   else
//     $('.numTransfers').text(self.torrentManager.torrents.length + ' transfers')
// }

// App.prototype.updateTorrentUI = function ($torrent, torrent) {
//   if (!$torrent.attr('id'))
//     $torrent.attr('id', 'torrent_' + torrent.infoHash)

//   if (torrent.metadata)
//     $torrent.addClass('has-metadata')
//   else
//     $torrent.removeClass('has-metadata')

//   if (torrent.progress === 1)
//     $torrent.addClass('is-seeding')
//   else
//     $torrent.removeClass('is-seeding')

//   var timeRemaining
//   if (torrent.timeRemaining === Infinity) {
//     timeRemaining = 'remaining time unknown'
//   } else {
//     timeRemaining = moment(Date.now() + torrent.timeRemaining).fromNow() + '...'
//   }
//   $torrent.find('.timeRemaining').text(timeRemaining)

//   $torrent.find('.name').text(torrent.name)
//   $torrent.find('.downloaded').text(humanize.filesize(torrent.downloaded))
//   $torrent.find('.uploaded').text(humanize.filesize(torrent.uploaded))
//   $torrent.find('.length').text(humanize.filesize(torrent.length))
//   $torrent.find('.ratio').text(torrent.ratio)
//   $torrent.find('progress').attr('value', torrent.progress)
//   $torrent.find('.percentage').text((torrent.progress * 100).toFixed(2))
//   $torrent.find('.numPeers').text(torrent.swarm.numConns + torrent.swarm.numQueued)
//   $torrent.find('.numActivePeers').text(torrent.swarm.numPeers)
//   $torrent.find('.downloadSpeed').text(humanize.filesize(torrent.swarm.downloadSpeed()))
//   $torrent.find('.uploadSpeed').text(humanize.filesize(torrent.swarm.uploadSpeed()))
// }
