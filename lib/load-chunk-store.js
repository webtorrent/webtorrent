// TODO: publish this as a standalone module

module.exports = loadChunkStore

var BlockStream = require('block-stream2')
var MultiStream = require('multistream')

function loadChunkStore (streams, store, chunkLength, cb) {
  if (!Array.isArray(streams)) streams = [ streams ]
  if (!cb) cb = noop

  var index = 0
  var outstandingPuts = 0
  var finished = false

  var multistream = new MultiStream(streams)
  var blockstream = new BlockStream(chunkLength, { zeroPadding: false })

  multistream
    .on('error', onError)
    .pipe(blockstream)
      .on('data', onData)
      .on('finish', onFinish)
      .on('error', onError)

  function onData (chunk) {
    outstandingPuts += 1
    store.put(index, chunk, function (err) {
      if (err) return onError(err)
      outstandingPuts -= 1
      maybeDone()
    })
    index += 1
  }

  function onFinish () {
    finished = true
    maybeDone()
  }

  function onError (err) {
    cleanup()
    cb(err)
  }

  function maybeDone () {
    if (finished && outstandingPuts === 0) {
      cleanup()
      cb(null)
    }
  }

  function cleanup () {
    multistream.removeListener('error', onError)
    blockstream.removeListener('data', onData)
    blockstream.removeListener('finish', onFinish)
    blockstream.removeListener('error', onError)
  }
}

function noop () {}
