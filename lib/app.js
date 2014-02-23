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

  setupWindow()
  setupTorrentManager()
}

function setupWindow () {
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
    console.log(uri)
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

function setupTorrentManager () {
  window.torrentManager.on('addTorrent', function (torrent) {
    var $torrent = $(handlebars.templates.torrent(torrent))
    $('#torrents').append($torrent)
    window.setInterval(function () {
      $torrent.replaceWith(handlebars.templates.torrent(torrent))
    }, 300)
  })

  // var t = self.torrents['d2474e86c95b19b8bcfdb92bc12c9d44667cfa36']
  // $('.downloadMetadata').click(function () {
  //   t.downloadMetadata()
  // })

  window.torrentManager.on('torrent:metadata', function (torrent, metadata) {

  })
}


// TODO: show multiple torrents
function updateUI () {
  // console.log('Peer ID: ' + this.peerId.toString('utf8'))
  // console.log('Node ID: ' + this.nodeId.toString('hex'))

  var t = this.torrents['d2474e86c95b19b8bcfdb92bc12c9d44667cfa36']

  $('.infoHash span').text(t.infoHash)
  $('.displayName span').text(t.displayName)

  $('.dhtNodes span').text(Object.keys(this.dht.nodes).length)
  $('.dhtPeers span').text(Object.keys(this.dht.peers).length)

  var connectedPeers = 0
  for (var infoHash in this.torrents) {
    var torrent = this.torrents[infoHash]
    connectedPeers += torrent.numPeers
  }
  $('.connectedPeers span').text(connectedPeers)
  $('.downloadMetadata').toggleClass('highlight', !!t.metadata)
}