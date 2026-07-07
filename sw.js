/* ================================================================
   FAKE MEMETICS — service worker (companion to V2-index.html)
   Strategy:
   - HTML: network-first (always fresh site), cache fallback offline
   - Card art / fonts (ar.io, stampchain, tokenscan, doggy.market,
     gstatic): cache-first — Arweave media stops re-downloading on
     every visit. Cache capped at ~220 entries.
   - Chain APIs (tokenscan/xchain /api/): never cached — always live.
   Registration is optional: the site works identically without this
   file; V2-index.html only registers it on https/localhost.
   ================================================================ */
'use strict';

const VERSION = 'fake-memetics-v6-3';
const MEDIA_CACHE = VERSION + '-media';
const PAGE_CACHE = VERSION + '-page';
const MAX_MEDIA_ENTRIES = 220;

const MEDIA_HOSTS = [
  '.ar.io',
  'stampchain.io',
  'tokenscan.io',
  'cdn.doggy.market',
  'fakeraredirectory.com',
  'wiki.pepe.wtf',
  'fonts.gstatic.com',
  'fonts.googleapis.com'
];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.indexOf(VERSION) !== 0).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isMediaHost(url) {
  // repo-bundled media ("MEDIA for Github" folder) is cached the same way;
  // pathname arrives percent-encoded, so decode before matching
  if (url.origin === self.location.origin) {
    let p = url.pathname;
    try { p = decodeURIComponent(p); } catch (e) {}
    if (p.indexOf('/MEDIA for Github/') !== -1) return true;
  }
  return MEDIA_HOSTS.some(h =>
    h.charAt(0) === '.' ? url.hostname.endsWith(h) || url.hostname === h.slice(1) : url.hostname === h
  );
}

async function trimCache(name, max) {
  try {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    if (keys.length > max) {
      await cache.delete(keys[0]);
      return trimCache(name, max);
    }
  } catch (e) {}
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  // chain APIs stay live — never serve stale market data
  if (url.pathname.indexOf('/api/') === 0) return;

  // navigations: network-first, cached page offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(PAGE_CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(req)
          .then(hit => hit || caches.match('./'))
          .then(hit => hit || caches.match('./index.html'))
          .then(hit => hit || caches.match('./V2-index.html'))
      )
    );
    return;
  }

  // media/fonts: cache-first
  if (isMediaHost(url)) {
    e.respondWith(
      caches.match(req).then(hit => {
        if (hit) return hit;
        return fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(MEDIA_CACHE).then(c => {
              c.put(req, copy).then(() => trimCache(MEDIA_CACHE, MAX_MEDIA_ENTRIES));
            }).catch(() => {});
          }
          return res;
        });
      })
    );
  }
});
