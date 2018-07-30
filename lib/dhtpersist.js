var fs = require('fs')
var mkdirp = require('mkdirp')
var path = require('path')

var savingDhtState = false
function saveDhtState (dht, file, cb) {
  if (savingDhtState) return
  if (!dht) return // Quell after destroy
  savingDhtState = true
  var dhtState = dht.toJSON()
  var dhtStateJson = JSON.stringify(dhtState)
  mkdirp(
    path.dirname(file),
    function handleDhtSaveDirCreated (err) {
      if (err) {
        savingDhtState = false
        if (cb) cb(err)
        return
      }
      fs.writeFile(
        file,
        dhtStateJson,
        function handleDhtStateWritten () {
          savingDhtState = false
          if (cb) cb(null)
        }
      )
    }
  )
}

function readDhtState (file) {
  try {
    return fs.readFileSync(file)
  } catch (e) {
    switch (e.code) {
      case 'EACCES':
      case 'EISDIR':
      case 'ENOENT':
      case 'EPERM':
        return null
      default:
        throw e
    }
  }
}

function parseDhtState (dhtStateJson) {
  try {
    return JSON.parse(dhtStateJson)
  } catch (e) {
    if (e instanceof SyntaxError) return null
    else throw e
  }
}

function loadDhtState (file) {
  var dhtStateJson = readDhtState(file)
  if (!dhtStateJson) return null
  var dhtState = parseDhtState(dhtStateJson)
  if (!dhtState) return null
  return dhtState
}

function loadDhtNodes (file) {
  var dhtState = loadDhtState(file)
  if (!dhtState) return null
  if (!('nodes' in dhtState)) return null
  var nodes = dhtState.nodes
  if (!Array.isArray(nodes)) return null
  if (nodes.length === 0) return null // Don't load an empty nodes list
  return nodes
}

module.exports = {
  save: saveDhtState,
  loadNodes: loadDhtNodes
}
