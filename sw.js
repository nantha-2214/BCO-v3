/* Biz Card Organiser offline helper.
   App files: fetched fresh when online (so updates arrive), served from the phone when offline.
   Card reader / card finder libraries: versioned, so they are kept after the first download.
   (The reader's model files are kept by the app itself in its own "bco-ocr-v1" store.) */
var APP = 'bco-app-3.8', LIBS = 'bco-libs-v1';
var CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
var LIB_HOSTS = /(^|\.)(jsdelivr\.net|esm\.sh|unpkg\.com|projectnaptha\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(APP).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return /^bco-app-/.test(k) && k !== APP; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.origin === self.location.origin) {
    e.respondWith(fetch(r).then(function (res) {
      if (res.ok) { var cp = res.clone(); caches.open(APP).then(function (c) { c.put(r, cp); }); }
      return res;
    }).catch(function () {
      return caches.match(r, { ignoreSearch: true }).then(function (m) {
        return m || (r.mode === 'navigate' ? caches.match('./index.html') : undefined);
      }).then(function (m) { return m || Response.error(); });
    }));
    return;
  }
  if (LIB_HOSTS.test(u.hostname)) {
    e.respondWith(caches.open(LIBS).then(function (c) {
      return c.match(r).then(function (hit) {
        return hit || fetch(r).then(function (res) {
          if (res.ok || res.type === 'opaque') c.put(r, res.clone()).catch(function () {});
          return res;
        });
      });
    }));
  }
});
