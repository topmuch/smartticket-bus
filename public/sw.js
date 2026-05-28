// SmartTicketQR Service Worker v2
// Cache strategy: Stale-While-Revalidate for API, Cache-First for static assets

const CACHE_NAME = 'smartticket-v2';
const STATIC_CACHE = 'smartticket-static-v2';
const API_CACHE = 'smartticket-api-v1';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.svg',
];

// Patterns for different caching strategies
const API_PATTERN = /\/api\//;
const STATIC_PATTERN = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i;
const PAGE_PATTERN = /^\/(?:(?!\.).)*$/; // HTML pages (not files)

// Install: Pre-cache critical static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing SmartTicketQR Service Worker v2...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[SW] Pre-cache failed:', err);
      })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating SmartTicketQR Service Worker v2...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== API_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Route requests to appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // API requests: Network-First with API cache fallback
  if (API_PATTERN.test(url.pathname)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Static assets: Cache-First
  if (STATIC_PATTERN.test(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Navigation requests (HTML pages): Stale-While-Revalidate
  if (request.mode === 'navigate' || PAGE_PATTERN.test(url.pathname)) {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: Network-First
  event.respondWith(handleDefaultRequest(request));
});

// Strategy: Network-First for API requests (with short cache)
async function handleApiRequest(request) {
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache successful responses for offline use
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error(`API returned ${networkResponse.status}`);
  } catch (error) {
    // Network failed — serve from cache if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] API offline fallback (from cache):', request.url);
      return cachedResponse;
    }
    // No cache available — return offline response for API
    return new Response(
      JSON.stringify({ success: false, error: 'Hors connexion. Données non disponibles.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Strategy: Cache-First for static assets
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Ressource indisponible hors connexion', { status: 503 });
  }
}

// Strategy: Stale-While-Revalidate for navigation (pages)
async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // If network fails and we have a cached version, use it
      if (cachedResponse) {
        return cachedResponse;
      }
      // No cache available — serve offline fallback page
      return caches.match('/');
    });

  // Return cached version immediately (stale), update in background
  return cachedResponse || fetchPromise;
}

// Strategy: Network-First default
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Contenu indisponible hors connexion', { status: 503 });
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
