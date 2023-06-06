// this file needs to conditionally import a module, ESM doesn't support this synchronously
// we could avoid .cjs by using node:module but that doesn't sit well with preprocessors like typescript
// and bundlers which can bundle for node like webpack

module.exports = (() => {
  try {
    return require('utp-native')
  } catch (err) {
    console.warn('WebTorrent: uTP not supported', err)
    return {}
  }
})()
