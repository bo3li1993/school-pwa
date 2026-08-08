// المنظومة الرقمية — Service Worker v6.0
// Network Only — بدون cache نهائياً

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // ما نتدخل — المتصفح يجلب من الشبكة دايماً
});