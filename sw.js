const CACHE_NAME = 'course-rank-v1';

// Files to cache for offline use
const PRECACHE = [
  '/',
  '/index.html',
];

// Install — cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache
// Firebase and CDN requests always go to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always fetch from network for Firebase, Google APIs, CDNs
  const networkOnly = [
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firebase.googleapis.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'unpkg.com',
    'gstatic.com',
  ];

  if (networkOnly.some(domain => url.hostname.includes(domain))) {
    return; // let browser handle normally
  }

  // For app files: network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for app files
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache
        return caches.match(event.request)
          .then(cached => cached || caches.match('/index.html'));
      })
  );
});
