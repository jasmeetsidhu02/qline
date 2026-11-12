// QLine service worker.
//
// Its only job is to receive push messages when the page is closed. It does
// not cache anything on purpose: a stale cached app would show a wrong queue
// position, which is worse than a slow load.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    // A push can arrive with no body, or with something that is not JSON.
    // Either way we still show something rather than throwing, because a
    // worker that throws here shows the customer nothing at all.
    data = (event.data ? event.data.json() : null) || {};
  } catch (e) {
    data = {};
  }

  const title = data.title || 'QLine';
  const isTurn = data.kind === 'turn';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/maskable-192.png',
      // One tag per visit, so "your turn" replaces "you're next"
      // instead of leaving two messages on the lock screen.
      tag: data.tag || 'qline',
      renotify: true,
      requireInteraction: isTurn,
      vibrate: isTurn ? [300, 150, 300, 150, 300] : [200],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Reuse the tab they already have open, rather than piling up new ones.
      for (const client of open) {
        if (client.url.includes(target) && 'focus' in client) return client.focus();
      }
      if (open.length && 'navigate' in open[0]) {
        await open[0].focus();
        return open[0].navigate(target);
      }
      return self.clients.openWindow(target);
    })()
  );
});
