const CACHE_NAME = 'hosainan-school-cache-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './logo.png',
  './favicon.ico',
  './parent.html',
  './admin.html',
  './teacher.html',
  './js/modules/firebase-config.js' // تم تحديث المسار الجديد هنا بالملي
];

// ⏳ 1. حدث التثبيت الذكي (مقاوم للكراش تماماً)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('📦 جاري تهيئة وحقن أصول المنظومة بداخل الكاش المؤتمت...');
      
      // التكتيك الاحترافي: رفع الملفات حبة حبة عشان لو ملف واحد مساره غلط ما يضرب السستم كراش
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
          console.log(`✓ تم حفظه بالكاش بنجاح: ${asset}`);
        } catch (err) {
          console.warn(`⚠️ تنبيه: تعذر كاش الملف (يمكن مساره تغير أو مو موجود): ${asset}`);
        }
      }
    })
  );
  self.skipWaiting();
});

// 🧹 2. حدث التنشيط وتنظيف الكاش القديم الميت آلياً
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

// 🌐 3. استراتيجية جلب البيانات (جلب من الإنترنت أولاً لتحديث السستم لايف)
self.addEventListener('fetch', (e) => {
  // نتجاهل روابط الفايربيس الخارجية والـ Auth عشان ما تخرب عمليات تسجيل الدخول لايف
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // إذا الإنترنت شغال، نحدث نسخة الكاش بالخلفية فوراً
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(e.request)) // لو فصل إنترنت المدرسة، يفتح السستم من الكاش علطول
  );
});
