const CACHE_VERSION = "warehouse-v1";
const STATIC_CACHE = `warehouse-static-${CACHE_VERSION}`;
const OFFLINE_PAGE = "/warehouse/offline.html";

const PRECACHE_ASSETS = [
  OFFLINE_PAGE,
  "/warehouse/manifest.webmanifest",
  "/css/warehouse/operations-center.css",
  "/js/warehouse/pwa.js",
  "/assets/icons/favicon-192.png",
  "/assets/icons/favicon-512.png"
];

const isSameOrigin = (request) =>
  new URL(request.url).origin === self.location.origin;

const shouldBypassCache = (pathname) =>
  pathname === "/env.js" ||
  pathname.startsWith("/api/") ||
  pathname.startsWith("/functions/");

const isWarehouseStaticAsset = (pathname) =>
  pathname.startsWith("/css/warehouse/") ||
  pathname.startsWith("/js/warehouse/") ||
  pathname === "/warehouse/manifest.webmanifest";

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => cached);

  return cached || network;
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("warehouse-static-") &&
                key !== STATIC_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (!isSameOrigin(event.request)) {
    return;
  }

  const url = new URL(event.request.url);

  if (shouldBypassCache(url.pathname)) {
    event.respondWith(
      fetch(event.request, {
        cache: "no-store"
      })
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return cache.match(OFFLINE_PAGE);
      })
    );
    return;
  }

  if (isWarehouseStaticAsset(url.pathname)) {
    event.respondWith(
      staleWhileRevalidate(event.request)
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
