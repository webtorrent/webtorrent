module.exports = App

var $ = require('jquery')
var bncode = require('bncode')
var fs = require('fs')
var key = require('keymaster')
var humanize = require('humanize')

var TEMPLATE = {
  TORRENT: fs.readFileSync(__dirname + '/../views/torrent.html')
}

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

  self.initUI()

  self.updateUI()
  window.setInterval(function () {
    self.updateUI()
  }, 1000)
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

App.prototype.initUI = function () {
  var self = this
  self.torrentManager.torrents.forEach(function (torrent) {
    self.addTorrent(torrent)
  })
}

App.prototype.setupTorrentManager = function () {
  var self = this
  window.torrentManager.on('addTorrent', function (torrent) {
    self.addTorrent(torrent)
  })
  window.torrentManager.on('removeTorrent', function (torrent) {
    self.removeTorrent(torrent)
  })
}

App.prototype.addTorrent = function (torrent) {
  var self = this
  var $torrent = $(TEMPLATE.TORRENT)
  self.updateTorrentUI($torrent, torrent)

  $torrent.on('click', function () {
    self.downloadTorrentFile(torrent)
  })

  $('#torrents').append($torrent)
  self.updateUI()
}

App.prototype.removeTorrent = function (torrent) {
  var self = this
  $('#torrent_' + torrent.infoHash).remove()
  self.updateUI()
}

App.prototype.updateUI = function () {
  var self = this

  self.torrentManager.torrents.forEach(function (torrent) {
    var $torrent = $('#torrent_' + torrent.infoHash)
    self.updateTorrentUI($torrent, torrent)
  })

  $('.overall-stats .ratio span').text(self.torrentManager.ratio)

  // Number of transfers
  if (self.torrentManager.torrents.length === 1)
    $('.numTransfers').text('1 transfer')
  else
    $('.numTransfers').text(self.torrentManager.torrents.length + ' transfers')
}

App.prototype.updateTorrentUI = function ($torrent, torrent) {
  if (!$torrent.attr('id'))
    $torrent.attr('id', 'torrent_' + torrent.infoHash)

  if (torrent.metadata)
    $torrent.addClass('has-metadata')
  else
    $torrent.removeClass('has-metadata')

  $torrent.find('.title').text(torrent.title)
  $torrent.find('.downloaded').text(humanize.filesize(torrent.swarm.downloaded))
  $torrent.find('.uploaded').text(humanize.filesize(torrent.swarm.uploaded))
  $torrent.find('.ratio').text(torrent.swarm.ratio)
  $torrent.find('progress').attr('value', torrent.progress)
  $torrent.find('.numPeers').text(torrent.swarm.numConns + torrent.swarm.numQueued)
  $torrent.find('.numActivePeers').text(torrent.swarm.numPeers)
  $torrent.find('.downloadSpeed')
    .text(humanize.filesize(torrent.swarm.downloadSpeed()))
  $torrent.find('.uploadSpeed')
    .text(humanize.filesize(torrent.swarm.uploadSpeed()))
}

App.prototype.downloadTorrentFile = function (torrent) {
  var self = this
  if (!torrent.metadata)
    return

  var errorHandler = function (err) {
    console.error('error' + err.toString())
  }

  chrome.fileSystem.chooseEntry({
    type: 'saveFile',
    suggestedName: torrent.title + '.torrent'
  }, function (fileEntry) {
    if (!fileEntry)
      return

    fileEntry.createWriter(function (writer) {
      writer.onerror = errorHandler
      writer.onwriteend = function (e) {
        console.log('write complete')
      }

      writer.write(new Blob([torrent.torrentFile]), { type: 'application/x-bittorrent' })
    }, errorHandler)
  })
}
