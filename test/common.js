const os = require('os')
const fs = require('fs')
const path = require('path')

exports.getDownloadPath = function (infix, infoHash) {
  let tmpPath
  try {
    tmpPath = path.join(fs.statSync('/tmp') && '/tmp')
  } catch (err) {
    tmpPath = path.join(typeof os.tmpdir === 'function' ? os.tmpdir() : '/')
  }
  return path.join(tmpPath, 'webtorrent', 'test', infix, infoHash)
}
