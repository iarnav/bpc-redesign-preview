// BPC service worker — makes the site installable and keeps visited pages available offline.
// Bump CACHE_VERSION whenever the core files below change so phones pick up the new version.
const CACHE_VERSION = 'bpc-v7';
const CORE = [
  './', 'index.html', 'events.html', 'gallery.html', 'about.html', 'contact.html', 'donate.html', 'privacy.html',
  'style.css', 'assets/site.js', 'assets/search-index.json', 'manifest.webmanifest', 'assets/icons/icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Pages, CSS and JS: network first so a page never pairs with an outdated stylesheet;
  // fall back to cache when offline.
  const isCode = /\.(css|js)$/.test(new URL(req.url).pathname);
  if (req.mode === 'navigate' || isCode) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
    );
    return;
  }

  // Images and icons: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      });
      return hit || network;
    })
  );
});
