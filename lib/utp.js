module.exports = (() => {
  try {
    const utp = require('utp-native')
    utp.UTP_SUPPORT = true
    return utp
  } catch (err) {
    const utp = {}
    utp.UTP_SUPPORT = false
    return utp
  }
})()
