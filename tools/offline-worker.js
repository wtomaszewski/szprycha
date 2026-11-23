/* global manifest */
const scope = self.registration.scope;
// The M7b cache uses this prefix too.
const prefix = `szprycha-quiz:${scope}:`;
const cacheName = `${prefix}${manifest.version}`;
const precached = manifest.files.map((file) => new URL(file, scope).href);
const assets = new Set(precached);
const index = new URL('index.html', scope).href;

self.addEventListener('install', (event) => {
  // The browser keeps updates waiting until every window using the old build closes.
  event.waitUntil(
    caches.open(cacheName).then((cache) =>
      cache.addAll(
        precached.map(
          (url) =>
            new Request(url, {
              cache: 'reload',
              mode: 'same-origin',
              redirect: 'error',
            }),
        ),
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
      const runtime = `szprycha-assets:${scope}`;
      if (await caches.has(runtime)) {
        const keep = new Set(
          manifest.onDemand.map((file) => new URL(file, scope).href),
        );
        const cache = await caches.open(runtime);
        for (const request of await cache.keys())
          if (!keep.has(request.url)) await cache.delete(request);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate') url.search = '';
  const key =
    request.mode === 'navigate' && url.href === scope ? index : url.href;
  if (!assets.has(key)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      return (await cache.match(key)) ?? fetch(request, { redirect: 'error' });
    })(),
  );
});
