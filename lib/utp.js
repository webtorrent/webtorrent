module.exports = (() => {
  try {
    const utp = require('utp-native')
    utp.UTP_SUPPORT = true
    return utp
  } catch (err) {
    console.error('WebTorrent: uTP not supported. Using TCP as fallback')

    const utp = {}
    utp.UTP_SUPPORT = false
    return utp
  }
})()
