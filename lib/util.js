// var once = require('once')

/**
 * Convert a DOM File (from a FileList) to a Buffer
 * @param  {File} file
 * @return {Buffer}
 */
exports.fileToBuffer = function (file, cb) {
  var reader = new FileReader()
  reader.addEventListener('load', function (e) {
    var arr = new Uint8Array(e.target.result)
    cb(null, new Buffer(arr))
  })
  reader.addEventListener('error', function (err) {
    cb(new Error('FileReader error' + err))
  })
  reader.readAsArrayBuffer(file)
}
