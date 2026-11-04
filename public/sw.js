// SERA FASHION - Progressive Web App & Push Notification Service Worker
const CACHE_NAME = 'sera-fashion-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.svg'
];

// Install: Cache critical static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('SW Precache warning:', err);
      });
    })
  );
});

// Activate: Clean up old cache versions & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network first with cache fallback for static assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and avoid caching Firestore or API calls directly in SW
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip caching third-party tracking or Firebase Firestore web sockets
  if (
    url.hostname.includes('firestore') || 
    url.hostname.includes('google') || 
    url.hostname.includes('facebook') ||
    url.hostname.includes('clarity')
  ) {
    return;
  }

  // HTML navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Static assets (images, css, js)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache and refresh in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// 🔔 PUSH NOTIFICATION HANDLER (অফারের নোটিফিকেশন গ্রহণ - বড় ছবি ব্যানারসহ)
self.addEventListener('push', (event) => {
  let data = {
    title: 'SERA FASHION – বিশেষ অফার!',
    body: 'নতুন কালেকশন ও এক্সক্লুসিভ ডিসকাউন্ট দেখতে এখনই ট্যাপ করুন 🛍️',
    url: '/',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    image: ''
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    image: data.image || undefined, // 🖼️ Large expandable banner picture in Android notification shade
    tag: data.tag || 'sera-promo-' + (data.id || Date.now()),
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open_app', title: 'অফারটি দেখুন 🛍️' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// 📨 DIRECT MESSAGE HANDLER (টেস্ট বা ব্রডকাস্ট নোটিফিকেশন প্রদর্শনের জন্য)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const data = event.data.payload || {};
    const notificationOptions = {
      body: data.body || 'সেরা ফ্যাশনের নতুন কালেকশন ও বিশেষ অফার দেখতে ট্যাপ করুন।',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-192x192.png',
      image: data.image || undefined, // 🖼️ Large banner image
      tag: data.tag || 'sera-promo-' + Date.now(),
      renotify: true,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        url: data.url || '/'
      },
      actions: [
        { action: 'open_app', title: 'অফারটি দেখুন 🛍️' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'SERA FASHION', notificationOptions)
    );
  }
});

// 📲 NOTIFICATION CLICK HANDLER (নোটিফিকেশনে চাপ দিলে সরাসরি ওয়েবসাইটে চলে যাবে)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If window is already open, focus it and navigate
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          if (client.url === targetUrl || client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Otherwise open a new window/app
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

