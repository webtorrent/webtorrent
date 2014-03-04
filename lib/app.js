module.exports = App

var $ = require('jquery')
var bncode = require('bncode')
var dragDrop = require('./drag-drop')
var fs = require('fs')
var humanize = require('humanize')
var key = require('keymaster')
var moment = require('moment')
var util = require('./util')

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

  // Add existing torrents
  self.torrentManager.torrents.forEach(function (torrent) {
    self.addTorrent(torrent)
  })

  self.torrentManager.on('error', function (err) {
    console.error(err)
    // TODO: Show error in UI somehow
  })

  window.torrentManager.on('addTorrent', function (torrent) {
    self.addTorrent(torrent)
  })
  window.torrentManager.on('removeTorrent', function (torrent) {
    self.removeTorrent(torrent)
  })

  self.initUI()
}

App.prototype.initUI = function () {
  var self = this

  // OS menu buttons
  $('.system .close').on('click', function () {
    chrome.app.window.current().close()
  })
  $('.system .minimize').on('click', function () {
    chrome.app.window.current().minimize()
  })
  $('.system .maximize').on('click', function () {
    chrome.app.window.current().maximize()
  })

  // Add torrent by magnet uri
  $('#addTorrent').on('submit', function (e) {
    e.preventDefault()
    var uri = $('#addTorrent input').val().trim()
    if (uri) {
      window.torrentManager.addTorrent(uri)
      $('#addTorrent input').val('')
    }
  })

  dragDrop('body', function (files) {
    files.forEach(function (file) {
      util.fileToBuffer(file, function (err, torrent) {
        if (err) return console.error(err)
        console.log(torrent)
        // window.torrentManager.addTorrent()
      })
    })
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

  // Update the UI regularly
  self.updateUI()
  window.setInterval(function () {
    self.updateUI()
  }, 1000)
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
  $('.overall-stats .uploadSpeed span').text(humanize.filesize(self.torrentManager.uploadSpeed()))
  $('.overall-stats .downloadSpeed span').text(humanize.filesize(self.torrentManager.downloadSpeed()))

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

  if (torrent.progress === 1)
    $torrent.addClass('is-seeding')
  else
    $torrent.removeClass('is-seeding')

  var timeRemaining
  if (torrent.timeRemaining === Infinity) {
    timeRemaining = 'remaining time unknown'
  } else {
    timeRemaining = moment(Date.now() + torrent.timeRemaining).fromNow() + '...'
  }
  $torrent.find('.timeRemaining').text(timeRemaining)

  $torrent.find('.name').text(torrent.name)
  $torrent.find('.downloaded').text(humanize.filesize(torrent.downloaded))
  $torrent.find('.uploaded').text(humanize.filesize(torrent.uploaded))
  $torrent.find('.length').text(humanize.filesize(torrent.length))
  $torrent.find('.ratio').text(torrent.ratio)
  $torrent.find('progress').attr('value', torrent.progress)
  $torrent.find('.percentage').text((torrent.progress * 100).toFixed(2))
  $torrent.find('.numPeers').text(torrent.swarm.numConns + torrent.swarm.numQueued)
  $torrent.find('.numActivePeers').text(torrent.swarm.numPeers)
  $torrent.find('.downloadSpeed').text(humanize.filesize(torrent.swarm.downloadSpeed()))
  $torrent.find('.uploadSpeed').text(humanize.filesize(torrent.swarm.uploadSpeed()))
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
    suggestedName: torrent.name + '.torrent'
  }, function (fileEntry) {
    if (!fileEntry)
      return

    fileEntry.createWriter(function (writer) {
      writer.onerror = errorHandler
      writer.onwriteend = function (e) {
        console.log('write complete')
      }

      // TODO: remove torrent.file from here!
      writer.write(new Blob([torrent.file || torrent.torrentFile]), { type: 'application/x-bittorrent' })
    }, errorHandler)
  })
}
