// المنظومة الرقمية — Service Worker v4.0
// Network First — يجلب الجديد دايماً، ولو ما في نت يستخدم الـ cache

const CACHE_NAME = 'manzoma-v4.0';

// عند التثبيت — لا نحفظ شيء مسبقاً
self.addEventListener('install', event => {
    self.skipWaiting();
});

// عند التفعيل — نحذف كل الـ cache القديم
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Network First — يجرب الشبكة أولاً
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // API calls و Firebase — لا تُخزَّن
    if (url.hostname.includes('googleapis') ||
        url.hostname.includes('firebaseio') ||
        url.hostname.includes('cloudfunctions') ||
        url.hostname.includes('gstatic')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // حفظ نسخة في الـ cache للاستخدام offline
                if (response.ok && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // لو ما في نت — نستخدم الـ cache
                return caches.match(event.request).then(cached => {
                    return cached || new Response('⚠️ لا يوجد اتصال بالإنترنت', {
                        status: 503,
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    });
                });
            })
    );
});

// FCM Push Notifications
self.addEventListener('push', event => {
    const data = event.data?.json() || {};
    const title = data.title || 'المنظومة الرقمية';
    const body  = data.body  || 'لديك إشعار جديد';
    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: './logo.png',
            badge: './logo.png',
            dir: 'rtl',
            data: data.url || './'
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data || './')
    );
});

// Auto-update
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
