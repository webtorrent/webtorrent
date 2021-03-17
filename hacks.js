// Addresses an issue where RTC peers are not properly garbage collected in Chromium:
// https://bugs.chromium.org/p/chromium/issues/detail?id=825576
// This error leads to WebTorrent Desktop and Chromium-based browsers being completely
// unable to seed until the process is restarted:
// https://github.com/webtorrent/webtorrent/issues/1981
function forcePeerGC () {
  queueMicrotask(() => {
    let img = document.createElement('img')
    img.src = window.URL.createObjectURL(new Blob([new ArrayBuffer(5e+7)]))
    img.onerror = function () {
      window.URL.revokeObjectURL(this.src)
      img = null
    }
  })
}

setInterval(forcePeerGC, 30000)
