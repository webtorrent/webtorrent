var through2 = require('through2')
var crypto = require('crypto')


// encapsulated a crypto stream in order to:
// * lazily instantiate the underlying implementation
// * move to webworkers later on
module.exports = function SHA1 () {
  var hash
  function spawnOnDemand () {
    if (!hash)
      hash = crypto.createHash('sha1')
  }

  var self = through2(function (buffer, enc, callback) {
    spawnOnDemand()    
    hash.update(buffer)
    callback()
  }, function (callback) {
    spawnOnDemand()
    var digest = hash.digest('hex')
    self.hexDigest = digest
    this.push(digest)
    this.push(null)
    callback()
  })
  return self
}
