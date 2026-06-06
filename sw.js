// 🚀 ملف السيرفس وركر الذكي - نظام أتمتة الكاش اليومي بالتاريخ القياسي الموحد
const CACHE_NAME = `hosainan-${new Date().toISOString().slice(0, 10)}`;

// قائمة الأصول والملفات والموديلات الـ 22 المعتمدة لعمل السيستم بكفاءة
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './teacher.html',
  './parent.html',
  './tv.html',
  './manifest.json',
  './favicon.ico',
  './logo.png',
  './js/firebase-config.js',
  './js/modules/today.js',
  './js/modules/attendance.js',
  './js/modules/behavior.js',
  './js/modules/clinic.js',
  './js/modules/gatepass.js',
  './js/modules/visits.js',
  './js/modules/teacher_perf.js',
  './js/modules/reports.js',
  './js/modules/classes.js',
  './js/modules/users.js',
  './js/modules/teachers.js',
  './js/modules/student.js',
  './js/modules/students_manage.js',
  './js/modules/honors.js',
  './js/modules/date_search.js',
  './js/modules/guard.js',
  './js/modules/rounds.js',
  './js/modules/distribution.js',
  './js/modules/mailbox.js'
];

// ⏳ حدث التثبيت: ضخ وحقن أصول المنظومة بداخل الكاش المؤتمت بالخلفية
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 جاري تهيئة وحقن أصول المنظومة بداخل الكاش المؤتمت...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 🧹 حدث التنشيط: تدمير ومسح كاش الأيام السابقة فوراً لإنعاش أجهزة المعلمين والإدارة
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ تم تنظيف أرشيف كاش ليوم سابق لتوفير مساحة الهاتف:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 🌐 حدث جلب البيانات: استراتيجية الاستجابة الذكية وحماية حركات الفايربيس اللحظية
self.addEventListener('fetch', e => {
  if (e.request.url.includes('firestore.googleapis.com') || e.request.url.includes('firebasejs')) {
    return;
  }
  e.respondWith(
    fetch(e.request).then(res => {
      if (!res || res.status !== 200 || res.type !== 'basic') {
        return res;
      }
      const responseToCache = res.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(e.request, responseToCache);
      });
      return res;
    }).catch(() => {
      return caches.match(e.request);
    })
  );
});