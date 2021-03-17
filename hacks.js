// Addresses an issue where RTC peers are not properly garbage collected in Chromium:
// https://bugs.chromium.org/p/chromium/issues/detail?id=825576
// This error leads to WebTorrent Desktop and Chromium-based browsers being completely
// unable to seed until the process is restarted:
// https://github.com/webtorrent/webtorrent/issues/1981
let gcInterval = 1
function forcePeerGC () {
  let peer = new RTCPeerConnection()
  setTimeout(() => {
    peer.close()
    peer = null
  }, 10)
  console.log(gcInterval++)
  if (!(gcInterval % 20)) {
    queueMicrotask(() => {
      console.log('Collecting garbage.')
      let img = document.createElement('img')
      img.src = window.URL.createObjectURL(new Blob([new ArrayBuffer(5e+7)]))
      img.onerror = function () {
        window.URL.revokeObjectURL(this.src)
        img = null
      }
    })
  }
}

setInterval(forcePeerGC, 5000)
