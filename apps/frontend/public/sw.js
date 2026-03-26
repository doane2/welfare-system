// public/sw.js
// ─────────────────────────────────────────────────────────────────────────────
// Crater Welfare — Service Worker
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME  = 'crater-welfare-v2'
const OFFLINE_URL = '/offline.html'

// ── FIX: detect dev mode — never cache anything in development.
//         Next.js Turbopack continuously regenerates chunks and pages;
//         caching them causes the service worker to serve stale chunks
//         which triggers HMR to re-fetch, which re-caches, endlessly. ────────
const IS_DEV = self.location.hostname === 'localhost' ||
               self.location.hostname === '127.0.0.1' ||
               self.location.hostname.startsWith('192.168.')

// Only pre-cache the bare minimum shell
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── INSTALL ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ── ACTIVATE — clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and non-http requests
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // ── FIX: in dev mode, never intercept anything — let all requests
  //         pass through to the network untouched. This prevents the
  //         service worker from interfering with Turbopack HMR. ────────────
  if (IS_DEV) return

  // ── FIX: never intercept Next.js internal routes — HMR, webpack,
  //         turbopack chunks. These change on every save and must never
  //         be served from cache. ──────────────────────────────────────────
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/__nextjs') ||
    url.pathname.includes('turbopack') ||
    url.pathname.includes('webpack') ||
    url.pathname.includes('hmr')
  ) return

  // API requests — network only, never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'You are offline. Please check your connection.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )
    return
  }

  // Static assets (_next/static) — cache first in production only
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // Icons & images — cache first
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        }).catch(() => caches.match('/icons/icon-192.png'))
      })
    )
    return
  }

  // ── FIX: HTML pages — network ONLY in production, no caching.
  //         Caching HTML pages caused stale shells to be served after
  //         deploys, and in dev it caused the continuous reload loop.
  //         On network failure, serve the offline page. ───────────────────
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then(cached => cached || caches.match(OFFLINE_URL))
    )
  )
})

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Crater Welfare',
    body:  'You have a new notification.',
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag:   'crater-welfare-notif',
    data:  { url: '/dashboard' },
  }

  if (event.data) {
    try {
      const d = event.data.json()
      payload = {
        title: d.title || payload.title,
        body:  d.body  || payload.body,
        icon:  d.icon  || payload.icon,
        badge: d.badge || payload.badge,
        tag:   d.tag   || payload.tag,
        data:  d.data  || payload.data,
      }
    } catch {}
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    payload.icon,
      badge:   payload.badge,
      tag:     payload.tag,
      data:    payload.data,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view',    title: 'View'    },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        return clients.openWindow(targetUrl)
      })
  )
})

// ── BACKGROUND SYNC — retry failed payments ───────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-payments') {
    event.waitUntil(retrySyncedPayments())
  }
})

async function retrySyncedPayments() {
  try {
    const db     = await openDB()
    const queued = await getAllQueued(db)
    for (const item of queued) {
      try {
        const response = await fetch('/api/payments', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${item.token}`,
          },
          body: JSON.stringify(item.payload),
        })
        if (response.ok) {
          await deleteQueued(db, item.id)
          self.registration.showNotification('Payment Synced ✓', {
            body:  'Your payment was submitted successfully.',
            icon:  '/icons/icon-192.png',
            badge: '/icons/icon-96.png',
            tag:   'payment-synced',
          })
        }
      } catch {}
    }
  } catch {}
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('crater-welfare-sync', 1)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('payments')) {
        db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = e => reject(e.target.error)
  })
}

function getAllQueued(db) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('payments', 'readonly')
    const req = tx.objectStore('payments').getAll()
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = e => reject(e.target.error)
  })
}

function deleteQueued(db, id) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('payments', 'readwrite')
    const req = tx.objectStore('payments').delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = e => reject(e.target.error)
  })
}

// ── MESSAGE — skip waiting from app ──────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
