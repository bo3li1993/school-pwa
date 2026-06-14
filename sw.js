const CACHE_NAME = 'hs-system-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './admin.html',
    './teacher.html',
    './super.html',
    './import.html',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'
];

// 1. تثبيت الكاش وحفظ الملفات
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. تفعيل وحذف الكاش القديم لو سويت تحديث
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
        })
    );
    self.clients.claim();
});

// 3. محرك السرعة (جلب من الكاش أولاً، وإذا مافي يجيب من النت)
self.addEventListener('fetch', event => {
    // نتخطى طلبات فايربيس عشان البيانات تكون لايف دايماً
    if (event.request.url.includes('firestore') || event.request.url.includes('identitytoolkit')) return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        }).catch(() => {
            // لو مافي نت نهائياً ومافي كاش، يرجعه لصفحة الدخول
            return caches.match('./index.html');
        })
    );
});