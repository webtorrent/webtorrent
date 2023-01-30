import os from 'os'
import fs from 'fs'
import path from 'path'

const getDownloadPath = (infix, infoHash) => {
  let tmpPath
  try {
    tmpPath = path.join(fs.statSync('/tmp') && '/tmp')
  } catch (err) {
    tmpPath = path.join(typeof os.tmpdir === 'function' ? os.tmpdir() : '/')
  }
  return path.join(tmpPath, 'webtorrent', 'test', infix, infoHash)
}

export default { getDownloadPath }
