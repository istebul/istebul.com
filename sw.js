const CACHE_NAME = 'istebu-v2-cache-v46';
const ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  '/js/core/config.js',
  '/js/core/router.js',
  '/js/core/state.js',
  '/js/core/utils.js',
  '/js/core/api.js',
  '/js/core/supabase.js',
  '/js/features/auth/auth.js',
  '/js/ui/ui.js',
  '/js/data/catalog.js',
  '/js/data/market-data.js',
  '/js/data/turkey-locations.js',
  '/manifest.json',
  '/assets/images/placeholder.svg',
  '/assets/images/hero-illustration.svg',
  '/assets/icons/favicon-192.png',
  '/assets/icons/favicon-512.png'
];

const OFFLINE_PAGE = '/offline.html';
const DYNAMIC_CACHE = 'istebu-dynamic-v46';
const API_CACHE = 'istebu-api-v46';

// Install event - cache assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
      caches.open(DYNAMIC_CACHE),
      caches.open(API_CACHE)
    ])
  );
  console.log('Service worker installed');
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => !key.includes('v46')).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
  console.log('Service worker activated');
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncFailedRequests());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/icons/favicon-192.png',
      badge: '/assets/icons/favicon-192.png',
      data: data.url
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

const isAppShellRequest = (request) => {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname === '/env.js') return false;

  return request.mode === 'navigate'
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.js')
    || url.pathname === '/manifest.json';
};

const isApiRequest = (request) => {
  const url = new URL(request.url);
  return url.pathname.startsWith('/.netlify/functions/') ||
         url.hostname.includes('supabase');
};

const isImageRequest = (request) => {
  return request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);
};

const fetchAndCache = async (request, cacheName = DYNAMIC_CACHE) => {
  try {
    const response = await fetch(request);
    if (response && response.ok && request.url.startsWith(self.location.origin)) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('Fetch failed:', request.url, error);
    throw error;
  }
};

const getOfflineResponse = async () => {
  const cache = await caches.open(CACHE_NAME);
  return await cache.match(OFFLINE_PAGE) || await cache.match('/index.html');
};

// Stale-while-revalidate strategy for API calls
const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
};

// Cache-first strategy for images
const cacheFirst = async (request) => {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    return await fetchAndCache(request);
  } catch (error) {
    // Return placeholder for images
    if (isImageRequest(request)) {
      return cache.match('/assets/images/placeholder.svg');
    }
    throw error;
  }
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname === '/env.js') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const cache = caches.open(DYNAMIC_CACHE);
            cache.then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => getOfflineResponse())
    );
    return;
  }

  // API requests - stale while revalidate
  if (isApiRequest(event.request)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Images - cache first
  if (isImageRequest(event.request)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // App shell requests - network first with cache fallback
  if (isAppShellRequest(event.request)) {
    event.respondWith(
      fetchAndCache(event.request, CACHE_NAME)
        .catch(() => caches.match(event.request))
        .then(response => response || getOfflineResponse())
    );
    return;
  }

  // Default - cache first with network fallback
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetchAndCache(event.request))
      .catch(() => getOfflineResponse())
  );
});

// Background sync implementation
async function syncFailedRequests() {
  const cache = await caches.open('failed-requests');
  const keys = await cache.keys();

  return Promise.all(
    keys.map(async (request) => {
      try {
        await fetch(request);
        await cache.delete(request);
        console.log('Synced failed request:', request.url);
      } catch (error) {
        console.log('Failed to sync:', request.url, error);
      }
    })
  );
}

// Message handling for install prompt and sync
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SYNC_FAILED_REQUESTS') {
    event.waitUntil(syncFailedRequests());
  }
});
