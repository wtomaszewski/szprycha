import pl from '../../i18n/pl.json';
import { textAt } from '../content/translation';
export const FONT = 'Pixelify Sans';
export const ui = pl;
export function translate(key: string): string {
  return textAt(pl, key) ?? key;
}

export function missionClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function showError(error: unknown) {
  console.error(error);
  document.getElementById('pwa-splash')?.remove();
  const status = document.getElementById('status');
  if (status) {
    status.textContent = ui.loadError;
    status.setAttribute('role', 'alert');
  }
}
