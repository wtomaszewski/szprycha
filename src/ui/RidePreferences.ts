import { ui } from '../core/presentation';
import type { ProgressStore } from '../core/progressStore';

export function ridePreference(
  store: ProgressStore,
  preference: 'reducedEffects' | 'reflectiveVest',
) {
  const label = document.createElement('label');
  label.className = 'ride-preference';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = store.profile[preference];
  input.addEventListener('change', () => {
    store.change((profile) => {
      profile[preference] = input.checked;
    });
  });
  label.append(input, ui.settings[preference]);
  return label;
}
