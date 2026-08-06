const CACHE = 'gmat-varc-v6';

const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './github-sync.js',
  './manifest.json',
  './icon.svg',
  './data/questions.json',
  './data/daily-plan.json',
];

const NETWORK_FIRST = ['.json', 'app.js', 'styles.css', 'index.html'];

function cacheKey(url) {
  const u = new URL(url);
  u.search = '';
  return u.href;
}

function isNetworkFirst(url) {
  return NETWORK_FIRST.some((suffix) => url.pathname.endsWith(suffix) || url.pathname.endsWith(`/${suffix}`));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isNetworkFirst(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(cacheKey(event.request.url), copy));
          }
          return response;
        })
        .catch(() => caches.match(cacheKey(event.request.url)))
    );
    return;
  }

  event.respondWith(
    caches.match(cacheKey(event.request.url)).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length) return list[0].focus();
      return clients.openWindow('./index.html');
    })
  );
});
