// 🚀 ملف السيرفس وركر المطور لإدارة الكاش والتحديث التلقائي للمنظومة
const CACHE_NAME = 'hosainan-v3'; // رفع الإصدار لتطهير كاش أجهزة المستخدمين آلياً

// قائمة الأصول والملفات والموديلات الـ 21 المعتمدة لعمل السيستم بدون إنترنت
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

// ⏳ حدث التثبيت: ضخ الملفات الجديدة داخل الـ Cache بالخلفية
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 جاري تهيئة وحقن ملفات المنظومة بداخل الكاش المحمي...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 🧹 حدث التنشيط: مسح وتدمير كاش الإصدارات القديمة (v2 و v1) لمنع التضارب
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ تم رصد كاش قديم ومسحه فوراً لتحديث جهاز المستخدم:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 🌐 حدث جلب البيانات: تشغيل استراتيجية ذكية تضمن تحديث البيانات الحية
self.addEventListener('fetch', e => {
  // منع كاش السيرفس وركر من التداخل مع طلبات الفايربيس والفايرستور الحية
  if (e.request.url.includes('firestore.googleapis.com') || e.request.url.includes('firebasejs')) {
    return;
  }

  e.respondWith(
    fetch(e.request).then(res => {
      // إذا الاستجابة سليمة نحدث الكاش محلياً طيران
      if (!res || res.status !== 200 || res.type !== 'basic') {
        return res;
      }
      const responseToCache = res.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(e.request, responseToCache);
      });
      return res;
    }).catch(() => {
      // في حال انقطع الإنترنت تماماً، يسحب من الكاش المخزن لحماية المعلم من التعليق
      return caches.match(e.request);
    })
  );
});