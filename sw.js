// المنظومة الرقمية — Service Worker v6.0
// Network Only — بدون cache
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) { return caches.delete(k); }));
        }).then(function() { return self.clients.claim(); })
    );
});
self.addEventListener('fetch', function() {});
