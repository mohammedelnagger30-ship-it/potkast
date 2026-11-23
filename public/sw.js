// Service Worker: offline app shell + push notifications.
const VERSION = 'nammy-v5';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
// Audio cache is intentionally unversioned: app updates must not delete files
// the user already downloaded.
const AUDIO_CACHE = 'nammy-audio';
const AUDIO_PREFIX = '/__offline_audio__/';
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) =>
            name.startsWith('nammy-v') &&
            name !== SHELL_CACHE &&
            name !== RUNTIME_CACHE &&
            name !== AUDIO_CACHE)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Download fallback: some audio CDNs do not send CORS headers. A no-cors
// response is opaque, but Cache Storage can keep it and serve it to <audio>.
self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'cache-audio') {
    const port = event.ports[0];
    event.waitUntil((async () => {
      try {
        const response = await fetch(new Request(data.url, { mode: 'no-cors', credentials: 'omit' }));
        const cache = await caches.open(AUDIO_CACHE);
        await cache.put(AUDIO_PREFIX + data.episodeId, response);
        port?.postMessage({ ok: true });
      } catch (err) {
        port?.postMessage({ ok: false, error: String(err) });
      }
    })());
  } else if (data.type === 'delete-audio') {
    event.waitUntil(
      caches.open(AUDIO_CACHE).then((cache) => cache.delete(AUDIO_PREFIX + data.episodeId))
    );
  }
});

// Keep the whole interface available without a connection.
// Audio files are handled separately in IndexedDB by the download manager.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Files saved through the no-cors fallback.
  if (url.origin === self.location.origin && url.pathname.startsWith(AUDIO_PREFIX)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // App routes: network first, then the cached shell so any page opens offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(async () =>
          (await caches.match('/index.html')) ||
          (await caches.match('/')) ||
          Response.error()
        )
    );
    return;
  }

  // Built assets and icons: cache first, then refresh in the background.
  // Only cache built assets. Dev-server source modules are left alone so HMR
  // keeps working while developing.
  const isAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      ['/icon.svg', '/manifest.webmanifest', '/favicon.ico', '/first-episodes.json'].includes(url.pathname));

  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      })
    );
  }
});

// Push notifications (unchanged behaviour).
self.addEventListener('push', (event) => {
  let data = { title: 'Sada', body: 'إشعار جديد' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Sada', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    dir: 'rtl',
    lang: 'ar',
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
