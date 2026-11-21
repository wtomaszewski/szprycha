import pl from '../../i18n/pl.json';
export const FONT = 'Pixelify Sans';
export const ui = pl;
export function showError(error: unknown) {
  console.error(error);
  const status = document.getElementById('status');
  if (status) {
    status.textContent = ui.loadError;
    status.setAttribute('role', 'alert');
  }
}
