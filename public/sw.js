// Service Worker: offline app shell + push notifications.
const VERSION = 'nammy-v6';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
// Audio cache is intentionally unversioned: app updates must not delete files
// the user already downloaded.
const AUDIO_CACHE = 'nammy-audio';
// Artwork is small (the app requests resized JPEGs) but numerous, so it gets
// its own bounded cache that survives shell updates.
const IMAGE_CACHE = 'nammy-images-v1';
const IMAGE_CACHE_LIMIT = 400;
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
            (name.startsWith('nammy-v') || name.startsWith('nammy-images-v')) &&
            name !== SHELL_CACHE &&
            name !== RUNTIME_CACHE &&
            name !== AUDIO_CACHE &&
            name !== IMAGE_CACHE)
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

async function pruneImageCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= IMAGE_CACHE_LIMIT) return;
  // Cache.keys() is in insertion order, so the first entries are the oldest.
  await Promise.all(
    keys.slice(0, keys.length - IMAGE_CACHE_LIMIT).map((key) => cache.delete(key))
  );
}

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

  // Artwork: cache first. Resized covers rarely change and the proxy sends a
  // one-year cache header, so repeat visits and list scrolling stay instant.
  const isImageProxy = url.hostname === 'wsrv.nl' || url.hostname === 'images.weserv.nl';
  const isLocalImage = url.origin === self.location.origin &&
    /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(url.pathname);
  if (isImageProxy || isLocalImage) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        // <img> requests are no-cors, so opaque responses are expected and are
        // valid Cache Storage entries for later image loads.
        if (response.ok || response.type === 'opaque') {
          await cache.put(request, response.clone());
          void pruneImageCache(cache);
        }
        return response;
      } catch (err) {
        return cached || Response.error();
      }
    })());
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
