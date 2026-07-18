importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// تهيئة Firebase داخل الـ Service Worker لاستقبال إشعارات الدفع الخلفية
firebase.initializeApp({
    apiKey: "AIzaSyDEA77qGfSK7w5rYynyzP9-mvD13rRT0tU",
    authDomain: "hosainan-school.firebaseapp.com",
    projectId: "hosainan-school",
    messagingSenderId: "264264994076",
    appId: "1:264264994076:web:1a87730b7d3c684bdf3ed9"
});

const messaging = firebase.messaging();

// معالجة واستقبال رسائل الدفع الفورية عندما يكون التطبيق في الخلفية أو مغلقاً
messaging.onBackgroundMessage(function(payload) {
    const notificationTitle = payload.notification.title || "تنبيه جديد — المنظومة الرقمية";
    const notificationOptions = {
        body: payload.notification.body || "",
        icon: '/school-pwa/logo.png',
        badge: '/school-pwa/favicon.ico',
        vibrate: [200, 100, 200],
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// إعدادات نظام الكاش والعمل بدون اتصال (PWA Offline Support)
const CACHE_NAME = `hosainan-school-${new Date().toISOString().slice(0,10)}`;

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './admin.html',
    './teacher.html',
    './parent.html',
    './guard.html',
    './social.html',
    './tv.html',
    './super.html',
    './import.html',
    './department_head.html',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
    'https://fonts.googleapis.com/css2?family=Cairo:wght=400;600;700;900&display=swap'
];

// 1. تثبيت الكاش وحفظ الملفات الأساسية لسرعة الـ PWA
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. تفعيل وحذف كل الكاش القديم فوراً (وليس بانتظار تغيير التاريخ فقط)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// 3. محرك الجلب: "الشبكة أولاً" لضمان ظهور أي تحديث فوراً عند توفر الإنترنت،
// وفقط عند انقطاع الشبكة (أو فشل الجلب) نرجع لآخر نسخة محفوظة بالكاش (دعم العمل بدون نت)
self.addEventListener('fetch', event => {
    // نتخطى طلبات السيرفر الحي لفايربيس والتوثيق لضمان دقة البيانات الحية دائمًا
    if (event.request.url.includes('firestore') || event.request.url.includes('identitytoolkit') || event.request.url.includes('googleapis')) return;

    event.respondWith(
        fetch(event.request).then(networkResponse => {
            // نحدّث الكاش بأحدث نسخة لاستخدامها لاحقاً عند انقطاع النت
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
            return networkResponse;
        }).catch(() => {
            // لا يوجد إنترنت → نرجع لآخر نسخة محفوظة، وإن لم توجد نرجع لصفحة الدخول
            return caches.match(event.request).then(cached => cached || caches.match('./index.html'));
        })
    );
});
