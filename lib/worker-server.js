/* global clients, MessageChannel, ReadableStream, Response */
/* eslint-env serviceworker */

const portTimeoutDuration = 5000

module.exports = event => {
  const { request } = event
  const { url, method, headers, destination } = request
  if (!url.includes(self.registration.scope + 'webtorrent/')) return null
  if (url.includes(self.registration.scope + 'webtorrent/keepalive/')) return new Response()

  return clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => {
      return new Promise(resolve => {
        // Use race condition for whoever controls the response stream
        for (const client of clients) {
          const messageChannel = new MessageChannel()
          const { port1, port2 } = messageChannel
          port1.onmessage = event => {
            resolve([event.data, messageChannel])
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
    })
    .then(([data, messageChannel]) => {
      if (data.body === 'STREAM' || data.body === 'DOWNLOAD') {
        let timeOut = null
        return new Response(new ReadableStream({
          pull (controller) {
            return new Promise(resolve => {
              messageChannel.port1.onmessage = event => {
                if (event.data) {
                  controller.enqueue(event.data) // event.data is Uint8Array
                } else {
                  clearTimeout(timeOut)
                  controller.close() // event.data is null, means the stream ended
                  messageChannel.port1.onmessage = null
                }
                resolve()
              }

              // 'media player' does NOT signal a close on the stream and we cannot close it because it's locked to the reader,
              // so we just empty it after 5s of inactivity, the browser will request another port anyways
              clearTimeout(timeOut)
              if (data.body === 'STREAM') {
                timeOut = setTimeout(() => {
                  controller.close()
                  messageChannel.port1.postMessage(false) // send timeout
                  messageChannel.port1.onmessage = null
                  resolve()
                }, portTimeoutDuration)
              }

              messageChannel.port1.postMessage(true) // send a pull request
            })
          },
          cancel () {
            // This event is never executed
            messageChannel.port1.postMessage(false) // send a cancel request
          }
        }), data)
      }

      return new Response(data.body, data)
    })
    .catch(console.error)
}
