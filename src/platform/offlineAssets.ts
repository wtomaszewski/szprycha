import { Capacitor } from '@capacitor/core';

export function cachesRideAssets() {
  return (
    import.meta.env.PROD &&
    !Capacitor.isNativePlatform() &&
    typeof window !== 'undefined' &&
    'caches' in window
  );
}

export async function fetchOfflineAsset(
  path: string,
  options: Pick<RequestInit, 'signal' | 'priority'> = {},
) {
  if (!cachesRideAssets()) return fetch(path, options);
  const scope = new URL(import.meta.env.BASE_URL, document.baseURI);
  const url = new URL(path, document.baseURI);
  if (!url.href.startsWith(scope.href)) return fetch(url, options);

  // The app can cache its first ride even while the service worker installs.
  const cache = await caches
    .open(`szprycha-assets:${scope.href}`)
    .catch(() => undefined);
  options.signal?.throwIfAborted();
  const cached = await cache?.match(url).catch(() => undefined);
  options.signal?.throwIfAborted();
  if (cached) return cached;

  const response = await fetch(url, { ...options, redirect: 'error' });
  if (
    cache &&
    response.status === 200 &&
    !response.headers.get('Content-Type')?.startsWith('text/html')
  )
    await cache.put(url, response.clone()).catch(() => undefined);
  return response;
}
