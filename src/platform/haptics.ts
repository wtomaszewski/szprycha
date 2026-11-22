import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';
import type { Verdict } from '../rules/types';

export const hasHaptics =
  Capacitor.isPluginAvailable('Haptics') && Capacitor.isNativePlatform();

let lastPulse = -Infinity;

export function verdictHaptics(kind: Verdict['kind'], enabled: boolean) {
  if (!hasHaptics || !enabled) return;
  const now = performance.now();
  if (kind === 'good' && now - lastPulse < 250) return;
  lastPulse = now;
  void Haptics.notification({
    type: kind === 'good' ? NotificationType.Success : NotificationType.Error,
  }).catch(() => {});
}
