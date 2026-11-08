/* Charta service worker: makes the app open offline and serves map tiles from cache. */
'use strict';
const SHELL = 'charta-shell-v3';
const PASSIVE = 'charta-tiles-v1';     // tiles you have looked at (trimmed to MAX_PASSIVE)
const OFFLINE = 'charta-offline-v1';   // tiles from "Download area" (never trimmed automatically)
const MAX_PASSIVE = 4000;
const REFRESH_AFTER_MS = 7 * 24 * 3600 * 1000;
const SHELL_URLS = [
  './', './index.html', './manifest.webmanifest', './brand/charta-wordmark-white.png', './brand/icon-192.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.min.js'
];
const TILE_RE = /\/\d+\/\d+\/\d+(@2x)?(\.(png|jpe?g|webp))?$/i;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  const keep = [SHELL, PASSIVE, OFFLINE];
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('charta-') && !keep.includes(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.destination === 'image' && TILE_RE.test(url.pathname)) return e.respondWith(tile(e));
  if (url.origin === self.location.origin) return e.respondWith(networkFirst(req));
  if (url.hostname === 'unpkg.com' || url.hostname === 'cdn.jsdelivr.net') return e.respondWith(cacheFirst(req));
});

// App files: always try the network so updates arrive, fall back to cache when offline.
async function networkFirst(req) {
  try {
    // no-cache: always revalidate with the server so new versions arrive straight away
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) (await caches.open(SHELL)).put(req, res.clone());
    return res;
  } catch {
    return (await caches.match(req, { ignoreSearch: true })) ||
      (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(SHELL)).put(req, res.clone());
  return res;
}

let puts = 0;
async function tile(e) {
  const key = e.request.url;
  const off = await (await caches.open(OFFLINE)).match(key, { ignoreVary: true });
  if (off) return off;
  const passive = await caches.open(PASSIVE);
  const hit = await passive.match(key, { ignoreVary: true });
  if (hit) {
    const age = Date.now() - (Date.parse(hit.headers.get('date')) || 0);
    if (age > REFRESH_AFTER_MS) e.waitUntil(fetchAndStore(e.request, passive).catch(() => {}));
    return hit;
  }
  try {
    return await fetchAndStore(e.request, passive);
  } catch {
    return new Response('', { status: 504, statusText: 'Offline and tile not cached' });
  }
}

async function fetchAndStore(req, cache) {
  const res = await fetch(req);
  // Only keep CORS/same-origin responses: opaque ones are padded to megabytes in storage quotas.
  if (res.ok && (res.type === 'cors' || res.type === 'basic')) {
    await cache.put(req.url, res.clone());
    if (++puts % 50 === 0) trim(cache);
  }
  return res;
}

async function trim(cache) {
  const keys = await cache.keys();
  const extra = keys.length - MAX_PASSIVE;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);   // oldest first
}
