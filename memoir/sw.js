/* Offline support. Bump CACHE when any of the files below change, otherwise
   installed copies keep serving the old version. */
var CACHE = 'my-life-stories-v2';

var SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './drive.js',
  './config.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Cache first: the app must open with no internet at all. Anything new is
   fetched and tucked away for next time. */
self.addEventListener('fetch', function (ev) {
  if (ev.request.method !== 'GET') return;

  ev.respondWith(
    caches.match(ev.request).then(function (hit) {
      if (hit) return hit;
      return fetch(ev.request).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(ev.request, copy); });
        }
        return res;
      }).catch(function () {
        // Offline and not cached: for a page request, hand back the app itself.
        if (ev.request.mode === 'navigate') return caches.match('./index.html');
        throw new Error('offline');
      });
    })
  );
});
