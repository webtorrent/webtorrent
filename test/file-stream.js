const test = require('tape')
const WebTorrent = require('..')

test('file-stream fetches chunks in parallel, works for large files', (t) => {
  t.plan(2)
  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })
  const length = 1024 * 1024 * 11;
  let idx = 0;
  let data = '0';
  while (data.length < length) {
    data += `${idx}`;
    idx++
  }
  const startingData = Buffer.from(data)
  client.seed(startingData, {
    announce: []
  }, torrent => {
    const start = Date.now()
    const artificialDelay = 10 // simulate a slow chunk look up, 10ms
    const origGet = torrent.store.get
    torrent.store.get = function (...rest) {
      const _this = this
      setTimeout(() => {
        origGet.apply(_this, rest)
      }, artificialDelay)
    }
    // time the total
    const readStream = torrent.files[0].createReadStream()
    const data = []
    readStream.on('data', (d) => {
      data.push(d)
    })
    readStream.on('end', () => {
      const readTime = Date.now() - start
      t.deepEqual(Buffer.concat(data), startingData)
      // reading should be much faster than doing so sequentially,
      // but it's difficult to assert this based solely on clock.
      // Let's just shoot for 20x faster.
      const upperLimit = artificialDelay * torrent.pieces.length / 20
      t.assert(readTime < upperLimit, `expect read time: ${readTime} to be less than ${upperLimit}`)
      client.destroy()
    })
  })
})

test('file-stream works for small files', (t) => {
  t.plan(1)
  const client = new WebTorrent({ dht: false, tracker: false, lsd: false })
  const length = 1023 * 100;
  let idx = 0;
  let data = '0';
  while (data.length < length) {
    data += `${idx}`;
    idx++
  }
  const startingData = Buffer.from(data)
  client.seed(startingData, {
    dht: false,
    announce: []
  }, torrent => {
    const artificialDelay = 10 // simulate a slow chunk look up, 10ms
    const origGet = torrent.store.get
    torrent.store.get = function (...rest) {
      const _this = this
      setTimeout(() => {
        origGet.apply(_this, rest)
      }, artificialDelay)
    }
    // time the total
    const readStream = torrent.files[0].createReadStream()
    const data = []
    readStream.on('data', (d) => {
      data.push(d)
    })
    readStream.on('end', () => {
      t.deepEqual(Buffer.concat(data), startingData)
      client.destroy()
    })
  });
});
