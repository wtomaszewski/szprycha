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
  const status = document.getElementById('status');
  if (status) {
    status.textContent = ui.loadError;
    status.setAttribute('role', 'alert');
  }
}

export function playerNickname(seed: number) {
  const { nicknames } = ui.skillMap;
  return `${nicknames[seed % nicknames.length]} ${Math.floor(seed / nicknames.length) + 1}`;
}
