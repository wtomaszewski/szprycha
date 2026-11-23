/* global manifest */
const scope = self.registration.scope;
// The M7b cache uses this prefix too.
const prefix = `szprycha-quiz:${scope}:`;
const cacheName = `${prefix}${manifest.version}`;
const lazyCacheName = `${prefix}lazy`;
const lazyKeys = new Map(
  Object.entries(manifest.lazy).map(([file, revision]) => {
    const url = new URL(file, scope);
    const href = url.href;
    url.searchParams.set('v', revision);
    return [href, url.href];
  }),
);
const lazyRevisions = new Set(lazyKeys.values());
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

// The previous worker put all assets in its precache. Move unchanged
// downloads into the on-demand cache before retiring that install.
async function keepPrecachedAssets(previous) {
  let target;
  for (const [url, revision] of lazyKeys) {
    const response = await previous.match(url);
    if (!response) continue;
    target ??= await caches.open(lazyCacheName);
    if (await target.match(revision)) continue;
    const digest = await crypto.subtle.digest(
      'SHA-256',
      await response.clone().arrayBuffer(),
    );
    const hash = Array.from(new Uint8Array(digest).subarray(0, 8), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    if (hash === new URL(revision).searchParams.get('v'))
      await target.put(revision, response);
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (
          key.startsWith(prefix) &&
          key !== cacheName &&
          key !== lazyCacheName
        ) {
          await keepPrecachedAssets(await caches.open(key)).catch(() => {
            // An unavailable or full cache must not block the new build.
          });
          await caches.delete(key);
        }
      if (await caches.has(lazyCacheName)) {
        const lazyCache = await caches.open(lazyCacheName);
        for (const request of await lazyCache.keys())
          if (!lazyRevisions.has(request.url)) await lazyCache.delete(request);
      }
      await self.clients.claim();
    })(),
  );
});

async function loadAsset(url, revision, request = url) {
  const cache = await caches.open(lazyCacheName).catch(() => undefined);
  const cached = await cache?.match(revision);
  if (cached) return cached;
  const response = await fetch(request, { redirect: 'error' });
  if (response.status === 200 && cache)
    await cache.put(revision, response.clone()).catch(() => {
      // A full storage quota still allows play over the network.
    });
  return response;
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache-assets' || !Array.isArray(event.data.urls))
    return;
  event.waitUntil(
    (async () => {
      for (const url of new Set(event.data.urls)) {
        const revision = lazyKeys.get(url);
        if (!revision) continue;
        await loadAsset(url, revision).catch(() => {
          // An interrupted download can be retried while online.
        });
      }
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
  const revision = lazyKeys.get(key);
  if (revision && !request.headers.has('range')) {
    event.respondWith(loadAsset(key, revision, request));
    return;
  }
  if (!assets.has(key)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      return (await cache.match(key)) ?? fetch(request, { redirect: 'error' });
    })(),
  );
});
