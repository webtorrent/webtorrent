/* global clients, MessageChannel, ReadableStream, Response */
/* eslint-env serviceworker */

const portTimeoutDuration = 5000
let cancellable = false

module.exports = event => {
  const { url } = event.request
  if (!url.includes(self.registration.scope + 'webtorrent/')) return null
  if (url.includes(self.registration.scope + 'webtorrent/keepalive/')) return new Response()
  if (url.includes(self.registration.scope + 'webtorrent/cancel/')) {
    return new Response(new ReadableStream({
      cancel () {
        cancellable = true
      }
    }))
  }
  return serve(event)
}

async function serve ({ request }) {
  const { url, method, headers, destination } = request
  const clientlist = await clients.matchAll({ type: 'window', includeUncontrolled: true })

  const [data, port] = await new Promise(resolve => {
    // Use race condition for whoever controls the response stream
    for (const client of clientlist) {
      const messageChannel = new MessageChannel()
      const { port1, port2 } = messageChannel
      port1.onmessage = ({ data }) => {
        resolve([data, port1])
      }
      client.postMessage({
        url,
        method,
        headers: Object.fromEntries(headers.entries()),
        scope: self.registration.scope,
        destination,
        type: 'webtorrent'
      }, [port2])
    }
  })

  if (data.body !== 'STREAM' && data.body !== 'DOWNLOAD') return new Response(data.body, data)

  let timeOut = null
  return new Response(new ReadableStream({
    pull (controller) {
      return new Promise(resolve => {
        port.onmessage = ({ data }) => {
          if (data) {
            controller.enqueue(data) // data is Uint8Array
          } else {
            clearTimeout(timeOut)
            controller.close() // data is null, means the stream ended
            port.onmessage = null
          }
          resolve()
        }
        if (!cancellable) {
          // firefox doesn't support cancelling of Readable Streams in service workers,
          // so we just empty it after 5s of inactivity, the browser will request another port anyways
          clearTimeout(timeOut)
          if (data.body === 'STREAM') {
            timeOut = setTimeout(() => {
              controller.close()
              port.postMessage(false) // send timeout
              port.onmessage = null
              resolve()
            }, portTimeoutDuration)
          }
        }
        port.postMessage(true) // send a pull request
      })
    },
    cancel () {
      port.postMessage(false) // send a cancel request
      clearTimeout(timeOut)
      port.onmessage = null
    }
  }), data)
}
