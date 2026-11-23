import { ui } from '../core/presentation';

export function watchForUpdate(
  registration: ServiceWorkerRegistration,
  notify: () => void,
) {
  let notified = false;
  const show = () => {
    if (notified || !registration.active) return;
    notified = true;
    notify();
  };
  const watchInstalling = () => {
    const worker = registration.installing;
    if (!worker) return;
    const onStateChange = () => {
      if (worker.state === 'installed') show();
      if (worker.state !== 'installing')
        worker.removeEventListener('statechange', onStateChange);
    };
    worker.addEventListener('statechange', onStateChange);
    onStateChange();
  };

  registration.addEventListener('updatefound', watchInstalling);
  if (registration.waiting) show();
  watchInstalling();
}

export async function showUpdateNotice(serviceWorker: ServiceWorkerContainer) {
  try {
    const registration = await serviceWorker.register(
      `${import.meta.env.BASE_URL}quiz-worker.js`,
      { updateViaCache: 'none' },
    );
    const notice = document.createElement('p');
    notice.className = 'pwa-update';
    notice.setAttribute('role', 'status');
    document.body.append(notice);
    watchForUpdate(registration, () => {
      notice.textContent = ui.pwaUpdate;
    });

    // Allow long game sessions to discover a new release without navigation.
    const check = () => {
      if (!document.hidden && navigator.onLine)
        void registration.update().catch(() => {
          // An offline or failed check leaves the current build in use.
        });
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    window.setInterval(check, 30 * 60 * 1000);
    if (registration.active) check();
  } catch (error) {
    console.warn('Offline cache unavailable', error);
  }
}

// A first use can occur before the installing worker claims the page.
export function cacheAfterInstall(urls: readonly string[]) {
  if (
    !import.meta.env.PROD ||
    !('serviceWorker' in navigator) ||
    !navigator.onLine
  )
    return;
  void navigator.serviceWorker.ready.then(({ active }) =>
    active?.postMessage({
      type: 'cache-assets',
      urls: urls.map((url) => new URL(url, document.baseURI).href),
    }),
  );
}
