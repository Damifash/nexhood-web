/* NexHood service worker: shows emergency alerts on the phone even when the
   app is closed, with vibration. No caching here, so new deploys are never stale. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let d = {}
  try {
    d = event.data ? event.data.json() : {}
  } catch (e) {
    d = { title: 'NexHood', body: event.data ? event.data.text() : '' }
  }
  const isAlert = d.kind === 'alert'
  event.waitUntil(
    self.registration.showNotification(d.title || 'NexHood', {
      body: d.body || '',
      tag: d.tag || 'nexhood',
      renotify: true,
      requireInteraction: isAlert,
      vibrate: isAlert ? [900, 300, 900, 300, 900, 300, 900, 300, 900] : [200, 100, 200],
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: d.url || '/app', alertId: d.alert_id || null },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/app'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url).catch(() => {})
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
