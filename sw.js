// المنظومة الرقمية — Service Worker v2.2
// Cache First للملفات الثابتة + Network First للبيانات

const CACHE_NAME = 'manzoma-v2.2';
const STATIC_CACHE = 'manzoma-static-v2.2';

const STATIC_ASSETS = [
  './index.html',
  './home.html',
  './nurse.html',
  './admin.html',
  './teacher.html',
  './parent.html',
  './guard.html',
  './social.html',
  './tv.html',
  './super.html',
  './import.html',
  './department_head.html',
  './user_guide.html',
  './style.css',
  './manifest.json',
  './logo.png',
  './favicon.ico',
];

// تثبيت — كاش الملفات الثابتة
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// تفعيل — حذف الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== STATIC_CACHE && k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// الطلبات — Cache First للـ HTML/CSS/JS، Network First للـ API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // تجاهل Firebase و Google APIs (تحتاج نت دائماً)
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('google') ||
      url.hostname.includes('wa.me')) {
    return;
  }

  // Cache First للملفات المحلية
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // لو ما في نت وما في كاش — أرجع index.html
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});

// استقبال FCM في الخلفية
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.notification?.body || '',
      icon: './logo.png',
      badge: './logo.png',
      tag: data.data?.type || 'notification',
      data: data.data || {},
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'عرض' },
        { action: 'dismiss', title: 'تجاهل' }
      ]
    };
    event.waitUntil(
      self.registration.showNotification(
        data.notification?.title || 'المنظومة الرقمية',
        options
      )
    );
  } catch(e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('المنظومة الرقمية', { body: text, icon: './logo.png' })
    );
  }
});

// النقر على الإشعار
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const data = event.notification.data || {};
  let url = './index.html';
  if (data.type === 'absence') url = './parent.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('school-pwa') && 'focus' in client) {
          client.focus(); return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
