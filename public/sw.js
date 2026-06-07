/* Service Worker — مصنع التركي ERP (PWA v3.0)
   استراتيجية: network-first للتنقل (مع رجوع للكاش عند انقطاع الشبكة)،
   و stale-while-revalidate للأصول الثابتة. */

const CACHE = 'turki-erp-v3';
const OFFLINE_FALLBACK = '/dashboard';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // التنقل بين الصفحات: الشبكة أولاً ثم الكاش
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_FALLBACK))),
    );
    return;
  }

  // الأصول الثابتة: من الكاش فوراً مع تحديث بالخلفية
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

// تنبيهات الدفع للحالات الحرجة (مخزون منخفض، دفعات متأخرة)
self.addEventListener('push', (event) => {
  let payload = { title: 'مصنع التركي', body: 'لديك تنبيه جديد' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {
    /* تجاهل */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/turki-logo.png',
      badge: '/turki-logo.png',
      dir: 'rtl',
      lang: 'ar',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/dashboard'));
});
