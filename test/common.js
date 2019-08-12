const os = require('os')
const fs = require('fs')
const path = require('path')

exports.getTestPath = function (infix, infoHash) {
  let testPath
  try {
    testPath = path.join(fs.statSync('/tmp') && '/tmp', 'webtorrent', 'test')
  } catch (err) {
    testPath = path.join(typeof os.tmpdir === 'function' ? os.tmpdir() : '/', 'webtorrent', 'test')
  }
  return path.join(testPath, infix, infoHash)
}
