import fileResponse from './worker-server.js'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('fetch', event => {
  const res = fileResponse(event)
  if (res) event.respondWith(res)
})

self.addEventListener('activate', () => {
  self.clients.claim()
})
