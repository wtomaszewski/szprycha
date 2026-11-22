import pl from '../../i18n/pl.json' with { type: 'json' };
import { textAt } from '../content/translation.ts';
export const FONT = 'Pixelify Sans';
export const ui = pl;
export function translate(key: string): string {
  return textAt(pl, key) ?? key;
}
export function showError(error: unknown) {
  console.error(error);
  const status = document.getElementById('status');
  if (status) {
    status.textContent = ui.loadError;
    status.setAttribute('role', 'alert');
  }
}
