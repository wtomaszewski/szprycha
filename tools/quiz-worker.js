/* global manifest */
const scope = self.registration.scope;
const prefix = `szprycha-quiz:${scope}:`;
const cacheName = `${prefix}${manifest.version}`;
const precached = manifest.files.map((file) => new URL(file, scope).href);
const assets = new Set(precached);
const index = new URL('index.html', scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) =>
        cache.addAll(
          precached.map((url) => new Request(url, { cache: 'reload' })),
        ),
      ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith(prefix) && key !== cacheName)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = '';
  const shell =
    request.mode === 'navigate' && (url.href === scope || url.href === index);
  const key = shell ? index : request.url;
  if (!assets.has(key)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      return (await cache.match(key)) ?? fetch(request);
    })(),
  );
});
