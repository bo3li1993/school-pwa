const CACHE_NAME = 'school-pwa-20260918163424';
const STATIC_ASSETS = [
    './',
    './index.html',
    './admin.html',
    './teacher.html',
    './parent.html',
    './department_head.html',
    './style.css',
    './manifest.json',
    './logo.png',
    './js/firebase-config.js',
    './js/cleanup.js',
];

// Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¹Ø·Â¢Ø¢Â¾Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â«Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â¨Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â¸Ø·Â¢Ø¢Â¹Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¹Ø·Â¢Ø¢Â¾: Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â®Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â²Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø·Â¹Ø¢Â©Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø·Â¢Ø¢Â  Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø·Â¢Ø¢Â¦Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â¸Ø·Â¢Ø¢Â¾Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¹Ø·Â¢Ø¢Â¾ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â£Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â³Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â³Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â¸Ø·Â¢Ø¢Â¹Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â©
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(STATIC_ASSETS.map(function(url) {
                return new Request(url, { cache: 'reload' });
            }));
        }).then(function() {
            return self.skipWaiting();
        }).catch(function(e) {
            console.warn('SW install error:', e);
        })
    );
});

// Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¹Ø·Â¢Ø¢Â¾Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â¸Ø·Â¢Ø¢Â¾Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â¹Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â¸Ø·Â¢Ø¢Â¹Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ : Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â­Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â°Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â¸Ø·Â¢Ø¢Â¾ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â¦Ø£Â¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â´ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø·Â¹Ã¢â‚¬Ú©Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â¯Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â¸Ø·Â¢Ø¢Â¹Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø·Â¢Ø¢Â¦
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) { return key !== CACHE_NAME; })
                    .map(function(key) { return caches.delete(key); })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â¨Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¹Ø·Â¢Ø¢Â¾: Network First Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â€šÂ¬Ø¹â€˜Ø·Â¢Ø¢Â¬ HTMLØ·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¥Ø£Â¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Cache First Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø·Â¢Ø¢Â¦Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â¸Ø·Â¢Ø¢Â¾Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¹Ø·Â¢Ø¢Â¾ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â«Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â¨Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¹Ø·Â¢Ø¢Â¾Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â©
self.addEventListener('fetch', function(event) {
    var url = event.request.url;

    // Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¹Ø·Â¢Ø¢Â¾Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â¬Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø·Â·Ø¥â€™Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€  Firebase Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â«Ø£Â¢Ã¢â€šÂ¬Ø¢Â Google
    if (url.includes('firestore.googleapis.com') ||
        url.includes('firebase.googleapis.com') ||
        url.includes('identitytoolkit.googleapis.com') ||
        url.includes('googleapis.com') ||
        url.includes('cloudfunctions.net') ||
        url.includes('gstatic.com') ||
        url.includes('fonts.googleapis.com')) {
        return;
    }

    // HTML: Network First Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø·Â¢Ø¢Â¦Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â¹ fallback
    if (event.request.mode === 'navigate' ||
        (event.request.method === 'GET' &&
         event.request.headers.get('accept') &&
         event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(event.request).then(function(response) {
                if (response && response.status === 200) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(function() {
                return caches.match(event.request).then(function(cached) {
                    return cached || caches.match('./index.html');
                });
            })
        );
        return;
    }

    // Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø·Â¢Ø¢Â¦Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â£Ø¢Â¢Ø£Â¢Ã¢â‚¬Ú‘Ø¢Â¬Ø£Â¢Ã¢â€šÂ¬Ø¹â€ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â¸Ø·Â·Ø¢Â¸Ø·Â¢Ø¢Â¾Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¹Ø·Â¢Ø¢Â¾ Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â«Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â§Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â¨Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¹Ø·Â¢Ø¢Â¾Ø·Â·Ø¢Â·Ø·Â¢Ø¢Â·Ø·Â·Ø¢Â¢Ø·Â¢Ø¢Â©: Cache First
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then(function(cached) {
                if (cached) return cached;
                return fetch(event.request).then(function(response) {
                    if (response && response.status === 200 && response.type !== 'opaque') {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                }).catch(function() {
                    return caches.match('./index.html');
                });
            })
        );
    }
});

// Offline page
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CACHE_URLS') {
        caches.open(CACHE_NAME).then(function(cache) {
            cache.addAll(event.data.urls || []);
        });
    }
});