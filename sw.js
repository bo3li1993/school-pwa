const CACHE_NAME = `hosainan-school-${new Date().toISOString().slice(0, 10)}`;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './login.html',
  './manifest.json',
  './style.css',
  './logo.png',
  './favicon.ico',
  './parent.html',
  './admin.html',
  './teacher.html',
  './social.html',
  './super.html',
  './js/firebase-config.js' // ✓ تم تصحيح المسار ليتوافق مع باقي صفحات المنظومة
];

// ⏳ 1. حدث التثبيت الذكي
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log(`📦 جاري تهيئة أصول المنظومة لكاش ${CACHE_NAME}...`);
      
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
          console.log(`✓ تم حفظه بالكاش: ${asset}`);
        } catch (err) {
          console.warn(`⚠️ تنبيه: تعذر كاش الملف: ${asset}`);
        }
      }
    })
  );
  self.skipWaiting();
});

// 🧹 2. حدث التنشيط (تنظيف كل الكاشات القديمة التي لا تطابق تاريخ اليوم)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 تنظيف مخلفات الكاش القديم:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 🌐 3. استراتيجية جلب البيانات (الإنترنت أولاً لضمان حية البيانات)
self.addEventListener('fetch', (e) => {
  // تجاهل روابط الفايربيس (API) الخارجية لكي لا تتعطل عمليات المزامنة الحية
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // إذا الإنترنت شغال، نحدث نسخة الكاش الخاصة بيومنا هذا فوراً
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(e.request)) // 💡 إغلاق الدالة المقطوعة: في حال فصل الإنترنت، يعرض آخر نسخة محفوظة
  );
});