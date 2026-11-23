import pl from '../../i18n/pl.json';
import { textAt } from '../content/translation';
export const FONT = 'Pixelify Sans';
export const ui = pl;
export function translate(
  key: string,
  values?: Readonly<Record<string, string>>,
): string {
  const text = textAt(pl, key) ?? key;
  if (!values) return text;
  return text.replace(/\{([a-z]+)\}/g, (placeholder, name: string) => {
    const value = Object.hasOwn(values, name) ? values[name] : undefined;
    return value === undefined ? placeholder : (textAt(pl, value) ?? value);
  });
}

export function missionClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function showError(error: unknown, message = ui.loadError) {
  console.error(error);
  document.getElementById('pwa-splash')?.remove();
  const status = document.getElementById('status');
  if (status) {
    status.textContent = message;
    status.setAttribute('role', 'alert');
  }
}
