/* eslint-env serviceworker */

const fileResponse = require('./worker-server.js')

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('fetch', event => {
  const res = fileResponse(event)
  if (res) event.respondWith(res)
})

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim())
})
