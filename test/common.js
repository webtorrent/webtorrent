const os = require('node:os')
const fs = require('node:fs')
const path = require('node:path')

exports.getDownloadPath = (infix, infoHash) => {
  let tmpPath
  try {
    tmpPath = path.join(fs.statSync('/tmp') && '/tmp')
  } catch (err) {
    tmpPath = path.join(typeof os.tmpdir === 'function' ? os.tmpdir() : '/')
  }
  return path.join(tmpPath, 'webtorrent', 'test', infix, infoHash)
}
