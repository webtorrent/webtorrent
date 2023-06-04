import Module from 'node:module'

const require = Module.createRequire(import.meta.url)

export default (() => {
  try {
    return require('utp-native')
  } catch (err) {
    console.warn('WebTorrent: uTP not supported', err)
    return {}
  }
})()
