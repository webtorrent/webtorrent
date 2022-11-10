export default (() => {
  try {
    return import('utp-native')
  } catch (err) {
    console.warn('WebTorrent: uTP not supported')
    return {}
  }
})()
