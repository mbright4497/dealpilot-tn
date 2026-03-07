const CACHE_NAME = 'closingpilot-v1';
const urlsToCache = [ '/', '/dashboard', '/styles.css', '/manifest.json' ];
self.addEventListener('install', function(event){ event.waitUntil(caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(urlsToCache); })); self.skipWaiting(); });
self.addEventListener('activate', function(event){ event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(event){ event.respondWith(caches.match(event.request).then(function(response){ return response || fetch(event.request); })); });
