module.exports = App

var $ = require('jquery')
var key = require('keymaster')
var handlebars = require('handlebars')
var humanize = require('humanize')

handlebars.registerHelper('humanizeFilesize', function (bytes) {
  return humanize.filesize(bytes)
})

/**
 * WebTorrent App UI
 */
function App (torrentManager) {
  var self = this
  if (!(self instanceof App)) return new App(torrentManager)

  self.torrentManager = torrentManager

  self.torrentManager.on('error', function (err) {
    console.error(err)
    // TODO: Show error in UI somehow
  })

  self.setupWindow()
  self.setupTorrentManager()
}

App.prototype.setupWindow = function () {
  $('.system .close').on('click', function () {
    chrome.app.window.current().close()
  })
  $('.system .minimize').on('click', function () {
    chrome.app.window.current().minimize()
  })
  $('.system .maximize').on('click', function () {
    chrome.app.window.current().maximize()
  })

  $('#addTorrent').on('submit', function (e) {
    e.preventDefault()
    var uri = $('#addTorrent input').val().trim()
    if (uri) {
      window.torrentManager.add(uri)
      $('#addTorrent input').val('')
    }
  })

  // chrome.contextMenus.onClicked.addListener(function (info) {
  //   if (!document.hasFocus()) {
  //     console.log('Ignoring context menu click that happened in another window');
  //     return;
  //   }

  //   console.log('Item selected in A: ' + info.menuItemId);
  // })

  // window.addEventListener('load', function (e) {
  //   chrome.contextMenus.create({
  //     title: 'Save .torrent',
  //     id: 'saveTorrent',
  //     contexts: ['all']
  //   })
  // })
}

App.prototype.setupTorrentManager = function () {
  window.torrentManager.on('addTorrent', function (torrent) {
    var $torrent = $(handlebars.templates.torrent(torrent))
    $('#torrents').append($torrent)

    // $('.downloadMetadata').click(function () {
    //   t.downloadMetadata()
    // })
  })

  // window.torrentManager.on('torrent:metadata', function (torrent, metadata) {
  //   var $torrent = $(handlebars.templates.torrent(torrent))
  //   $('#torrents').append($torrent)
  // })
}



  // $('.dhtPeers span').text(Object.keys(this.dht.peers).length)

  // var connectedPeers = 0
  // for (var infoHash in this.torrents) {
  //   var torrent = this.torrents[infoHash]
  //   connectedPeers += torrent.numPeers
  // }
  // $('.connectedPeers span').text(connectedPeers)
  // $('.downloadMetadata').toggleClass('highlight', !!t.metadata)

