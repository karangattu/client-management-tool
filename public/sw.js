/**
 * Service Worker for ClientHub
 * Provides offline support and background sync capabilities
 */

const CACHE_NAME = 'clienthub-v1';
const STATIC_CACHE = 'clienthub-static-v1';
const DYNAMIC_CACHE = 'clienthub-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/manifest.json',
  '/icon.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch((error) => {
      console.error('[Service Worker] Failed to cache static assets:', error);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip API and auth requests - always fetch fresh
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.includes('supabase')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update cache in background
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          })
          .catch(() => {
            // Network failed, but we have cache
          });
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((networkResponse) => {
          // Cache successful GET requests
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            request.method === 'GET'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.error('[Service Worker] Fetch failed:', error);
          
          // Return offline page for navigation requests
          if (request.destination === 'document') {
            return caches.match('/offline.html').then((offlineResponse) => {
              return offlineResponse || new Response('Offline - Please check your connection', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain',
                }),
              });
            });
          }
          
          throw error;
        });
    })
  );
});

// Background Sync - for offline form submissions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-clients') {
    event.waitUntil(syncClients());
  } else if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

// Sync functions
async function syncClients() {
  console.log('[Service Worker] Syncing clients...');
  // Implement client sync logic here
  // This would retrieve queued client updates from IndexedDB
  // and POST them to the server
}

async function syncTasks() {
  console.log('[Service Worker] Syncing tasks...');
  // Implement task sync logic here
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const options = {
    body: event.data?.text() || 'New notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    tag: 'clienthub-notification',
  };
  
  event.waitUntil(
    self.registration.showNotification('ClientHub', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

// Message handler - communicate with main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});
