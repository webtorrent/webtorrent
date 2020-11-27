module.exports = (() => {
  try {
    return require('utp-native')
  } catch (err) {
    console.warn('WebTorrent: uTP not supported')
    return {}
  }
})()
