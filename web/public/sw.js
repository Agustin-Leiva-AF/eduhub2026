// Service worker: recibe los avisos (Web Push) y los muestra como notificación del sistema.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { cuerpo: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.titulo || 'CFO de Bolsillo', {
    body: d.cuerpo || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.critico ? 'cfo-critico' : 'cfo-aviso',
    renotify: true,
    requireInteraction: Boolean(d.critico),
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const abierta = ws.find(w => 'focus' in w);
    return abierta ? abierta.focus() : self.clients.openWindow(url);
  }));
});
