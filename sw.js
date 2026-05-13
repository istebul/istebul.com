const CACHE_VERSION = 'v47';
const STATIC_CACHE = `istebu-static-${CACHE_VERSION}`;

const OFFLINE_PAGE = '/offline.html';

const PRECACHE_ASSETS = [
  OFFLINE_PAGE,
  '/assets/images/placeholder.svg',
  '/assets/icons/favicon-192.png',
  '/assets/icons/favicon-512.png'
];

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

const isSameOrigin = (request) => {
  const url = new URL(request.url);
  return url.origin === self.location.origin;
};

const isImageRequest = (request) => {
  return /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(new URL(request.url).pathname);
};

const getOfflinePage = async () => {
  const cache = await caches.open(STATIC_CACHE);
  return cache.match(OFFLINE_PAGE);
};

const getPlaceholderImage = async () => {
  const cache = await caches.open(STATIC_CACHE);
  return cache.match('/assets/images/placeholder.svg');
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (!isSameOrigin(event.request)) return;

  if (url.pathname === '/env.js') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  if (
    url.pathname.startsWith('/.netlify/functions/') ||
    url.hostname.includes('supabase')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => getOfflinePage())
    );
    return;
  }

  if (isImageRequest(event.request)) {
    event.respondWith(
      fetch(event.request).catch(() => getPlaceholderImage())
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

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
