var createTorrent = require("create-torrent")
var debug = require("debug")("ibinti.com")
var dragDrop = require("drag-drop")
var get = require("simple-get")
var formatDistance = require("date-fns/formatDistance")
var path = require("path")
var prettierBytes = require("prettier-bytes")
var throttle = require("throttleit")
var thunky = require("thunky")
var uploadElement = require("upload-element")
var WebTorrent = require("webtorrent")
var JSZip = require("jszip")

var util = require("./util")

global.WEBTORRENT_ANNOUNCE = createTorrent.announceList
  .map(function (arr) {
    return arr[0]
  })
  .filter(function (url) {
    return url.indexOf("wss://") === 0 || url.indexOf("ws://") === 0
  })

var DISALLOWED = [
  "6feb54706f41f459f819c0ae5b560a21ebfead8f"
]

var getClient = thunky(function (cb) {
  getRtcConfig(function (err, rtcConfig) {
    if (err) util.error(err)
    var client = new WebTorrent({
      tracker: {
        rtcConfig: rtcConfig
      }
    })
    window.client = client // for easier debugging
    client.on("warning", util.warning)
    client.on("error", util.error)
    cb(null, client)
  })
})

init()

function init () {
  if (!WebTorrent.WEBRTC_SUPPORT) {
    util.error("This browser is unsupported. Please use a browser with WebRTC support.")
  }

  // For performance, create the client immediately
  getClient(function () {})

  // Seed via upload input element
  var upload = document.querySelector("input[name=upload]")
  if (upload) {
    uploadElement(upload, function (err, files) {
      if (err) return util.error(err)
      files = files.map(function (file) { return file.file })
      onFiles(files)
    })
  }

  // Seed via drag-and-drop
  dragDrop("body", onFiles)

  // Download via input element
  var form = document.querySelector("form")
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault()
      downloadTorrent(document.querySelector("form input[name=torrentId]").value.trim())
    })
  }

  // Download by URL hash
  onHashChange()
  window.addEventListener("hashchange", onHashChange)
  function onHashChange () {
    var hash = decodeURIComponent(window.location.hash.substring(1)).trim()
    if (hash !== '') downloadTorrent(hash)
  }

  // Register a protocol handler for "magnet:" (will prompt the user)
  if ("registerProtocolHandler" in navigator) {
    navigator.registerProtocolHandler("magnet", window.location.origin + "#%s", "ibinti.com")
  }
}

function getRtcConfig (cb) {
  // WARNING: This is *NOT* a public endpoint. Do not depend on it in your app.
  get.concat({
    url: "/__rtcConfig__",
    timeout: 5000
  }, function (err, res, data) {
    if (err || res.statusCode !== 200) {
      cb(new Error("Could not get WebRTC config from server. Using default (without TURN)."))
    } else {
      var rtcConfig
      try {
        rtcConfig = JSON.parse(data)
      } catch (err) {
        return cb(new Error("Got invalid WebRTC config from server: " + data))
      }
      delete rtcConfig.comment
      debug("got rtc config: %o", rtcConfig)
      cb(null, rtcConfig)
    }
  })
}

function onFiles (files) {
  debug("got files:")
  files.forEach(function (file) {
    debug(" - %s (%s bytes)", file.name, file.size)
  })

  // .torrent file = start downloading the torrent
  files.filter(isTorrentFile).forEach(downloadTorrentFile)

  // everything else = seed these files
  seed(files.filter(isNotTorrentFile))
}

function isTorrentFile (file) {
  var extname = path.extname(file.name).toLowerCase()
  return extname === ".torrent"
}

function isNotTorrentFile (file) {
  return !isTorrentFile(file)
}

function downloadTorrent (torrentId) {
  var disallowed = DISALLOWED.some(function (infoHash) {
    return torrentId.indexOf(infoHash) >= 0
  })

  if (disallowed) {
    util.log("File not found " + torrentId)
  } else {
    util.log("Downloading torrent from " + torrentId)
    getClient(function (err, client) {
      if (err) return util.error(err)
      client.add(torrentId, onTorrent)
    })
  }
}

function downloadTorrentFile (file) {
  util.log("Downloading torrent from <strong>" + file.name + "</strong>")
  getClient(function (err, client) {
    if (err) return util.error(err)
    client.add(file, onTorrent)
  })
}

function seed (files) {
  if (files.length === 0) return
  util.log("Seeding " + files.length + " files")

  // Seed from WebTorrent
  getClient(function (err, client) {
    if (err) return util.error(err)
    client.seed(files, onTorrent)
  })
}

function onTorrent (torrent) {
  torrent.on("warning", util.warning)
  torrent.on("error", util.error)

  var upload = document.querySelector("input[name=upload]")
  upload.value = upload.defaultValue // reset upload element

  var torrentFileName = path.basename(torrent.name, path.extname(torrent.name)) + ".torrent"

  util.log('"' + torrentFileName + '" contains ' + torrent.files.length + ' files:')
  torrent.files.forEach(function (file) {
    util.log("&nbsp;&nbsp;- " + file.name + " (" + prettierBytes(file.length) + ")")
  })

  util.log(
    "Torrent info hash: " + torrent.infoHash + " " +
    '<a href="/#' + torrent.infoHash + '" onclick="prompt(\'Share this link with anyone you want to download this torrent:\', this.href);return false;">[Share link]</a> ' +
    '<a href="' + torrent.magnetURI + '" target="_blank">[Magnet URI]</a> ' +
    '<a href="' + torrent.torrentFileBlobURL + '" target="_blank" download="' + torrentFileName + '">[Download .torrent]</a>'
  )

  function updateSpeed () {
    var progress = (100 * torrent.progress).toFixed(1)

    var remaining
    if (torrent.done) {
      remaining = "Done"
    } else {
      remaining = torrent.timeRemaining !== Infinity
        ? formatDistance(torrent.timeRemaining, 0, { includeSeconds: true })
        : "infinity years"
      remaining = remaining[0].toUpperCase() + remaining.substring(1) + " remaining"
    }

    util.updateSpeed(
      '<b>Peers:</b> ' + torrent.numPeers + ' ' +
      '<b>Progress:</b> ' + progress + '% ' +
      '<b>Download speed:</b> ' + prettierBytes(window.client.downloadSpeed) + '/s ' +
      '<b>Upload speed:</b> ' + prettierBytes(window.client.uploadSpeed) + '/s ' +
      '<b>ETA:</b> ' + remaining
    )
  }

  torrent.on("download", throttle(updateSpeed, 250))
  torrent.on("upload", throttle(updateSpeed, 250))
  setInterval(updateSpeed, 5000)
  updateSpeed()

  torrent.files.forEach(function (file) {
    // append file
    file.appendTo(util.logElem, {
      maxBlobLength: 2 * 1000 * 1000 * 1000 // 2 GB
    }, function (err, elem) {
      if (err) return util.error(err)
    })

    // append download link
    file.getBlobURL(function (err, url) {
      if (err) return util.error(err)

      var a = document.createElement("a")
      a.target = "_blank"
      a.download = file.name
      a.href = url
      a.textContent = "Download " + file.name
      util.log(a)
    })
  })

  var downloadZip = document.createElement("a")
  downloadZip.href = "#"
  downloadZip.target = "_blank"
  downloadZip.textContent = "Download all files as zip"
  downloadZip.addEventListener("click", function (event) {
    var addedFiles = 0
    var zipFilename = path.basename(torrent.name, path.extname(torrent.name)) + ".zip"
    var zip = new JSZip()
    event.preventDefault()

    torrent.files.forEach(function (file) {
      file.getBlob(function (err, blob) {
        addedFiles += 1
        if (err) return util.error(err)

        // add file to zip
        zip.file(file.path, blob)

        // start the download when all files have been added
        if (addedFiles === torrent.files.length) {
          if (torrent.files.length > 1) {
            // generate the zip relative to the torrent folder
            zip = zip.folder(torrent.name)
          }
          zip.generateAsync({ type: "blob" })
            .then(function (blob) {
              var url = URL.createObjectURL(blob)
              var a = document.createElement("a")
              a.download = zipFilename
              a.href = url
              a.click()
              setTimeout(function () {
                URL.revokeObjectURL(url)
              }, 30 * 1000)
            }, util.error)
        }
      })
    })
  })
  util.log(downloadZip)
}