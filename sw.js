// Service Worker - App Shell Strategy
const CACHE_NAME = 'hosainan-v1';
const SHELL = [
  '/',
  '/index.html',
  '/admin.html', 
  '/teacher.html',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // API calls - always network (never cache live data)
  if(url.hostname.includes('script.google.com')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Shell - cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
