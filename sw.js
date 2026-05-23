const CACHE_VERSION = 'v49';
const STATIC_CACHE = `istebu-static-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

const PRECACHE_ASSETS = [
  OFFLINE_PAGE,
  '/assets/images/placeholder.svg',
  '/assets/icons/favicon-192.png',
  '/assets/icons/favicon-512.png'
];

const IMMUTABLE_ASSET = /\.[a-f0-9]{8,}\.(?:js|css)$/i;

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => undefined)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('istebu-') && !key.includes(CACHE_VERSION))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

const isSameOrigin = (request) => new URL(request.url).origin === self.location.origin;

const isImageRequest = (request) =>
  /\.(?:jpg|jpeg|png|gif|svg|webp|ico)$/i.test(new URL(request.url).pathname);

const shouldBypassCache = (pathname) =>
  pathname === '/env.js' ||
  pathname.startsWith('/.netlify/functions/') ||
  pathname.startsWith('/api/') ||
  pathname.startsWith('/functions/');

const cacheFirst = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (!isSameOrigin(event.request)) {
    return;
  }

  if (shouldBypassCache(url.pathname)) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return cache.match(OFFLINE_PAGE);
      })
    );
    return;
  }

  if (IMMUTABLE_ASSET.test(url.pathname) || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (isImageRequest(event.request)) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return cache.match('/assets/images/placeholder.svg');
      })
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/icons/favicon-192.png',
    badge: '/assets/icons/favicon-192.png',
    data: data.url || '/'
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
