const os = require('os')
const fs = require('fs')
const path = require('path')

exports.getDownloadPath = function (infix, infoHash) {
  let downloadPath
  try {
    downloadPath = path.join(fs.statSync('/tmp') && '/tmp', 'webtorrent', 'test')
  } catch (err) {
    downloadPath = path.join(typeof os.tmpdir === 'function' ? os.tmpdir() : '/', 'webtorrent', 'test')
  }
  return path.join(downloadPath, infix, infoHash)
}
