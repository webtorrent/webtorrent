// Download a torrent with itty-bitty-torrent

var path = require('path')

var Torrent = require('itty-bitty-torrent')
var downloadLocation = path.join(__dirname, 'tmp')
// var torrent = 'http://releases.ubuntu.com/13.10/ubuntu-13.10-server-amd64.iso.torrent'
// var torrent = path.join(__dirname, 'torrents/leaves.torrent')
var torrent = path.join(__dirname, 'torrents/pride.torrent')

var client = new Torrent(torrent, downloadLocation, function(err){
  if (!err) client.download()

  // Get speed
  setInterval(function(){
    console.log(Math.round(client.speed()) / 1000)
  }, 500)

  // Get percentage downloaded
  setInterval(function(){
    console.log(Math.round(client.percentage()))
  }, 10000)
})

client.on('finished', function(){
  console.log('finished')
  // The torrent has finished downloading.
})

// stop our torrent downloading & seeding
// client.stop()