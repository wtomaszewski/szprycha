function httpUrl(value: string | undefined, allowLocalHttp = false) {
  if (!value?.trim()) return;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password) return;
    if (
      url.protocol === 'https:' ||
      (allowLocalHttp &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
      return url.href;
  } catch {
    // An invalid address must not expose a control.
  }
}

export function parentZoneConfig(env: {
  VITE_RANKING_URL?: string;
  VITE_PRIVACY_POLICY_URL?: string;
  VITE_PROJECT_URL?: string;
}) {
  return {
    rankingAvailable: Boolean(httpUrl(env.VITE_RANKING_URL, true)),
    privacyUrl: httpUrl(env.VITE_PRIVACY_POLICY_URL),
    projectUrl: httpUrl(env.VITE_PROJECT_URL),
  };
}
