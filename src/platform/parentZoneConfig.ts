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

export const rankingUrl = (value: string | undefined) => httpUrl(value, true);

export function parentZoneConfig(env: {
  VITE_RANKING_URL?: string;
  VITE_PRIVACY_POLICY_URL?: string;
  VITE_PROJECT_URL?: string;
}) {
  return {
    rankingAvailable: Boolean(rankingUrl(env.VITE_RANKING_URL)),
    privacyUrl: httpUrl(env.VITE_PRIVACY_POLICY_URL),
    projectUrl: httpUrl(env.VITE_PROJECT_URL),
  };
}
