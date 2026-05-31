const CACHE_NAME = 'smart-school-v1';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './teacher.html',
  './dashboard.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// تثبيت الـ Service Worker وتخزين الملفات الأساسية مؤقتاً
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// تفعيل الـ Service Worker وتنظيف الكاش القديم
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// استدعاء الملفات من الكاش عند انقطاع الإنترنت أو لزيادة السرعة
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
