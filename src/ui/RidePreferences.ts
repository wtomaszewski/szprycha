import { hasHaptics } from '../platform/haptics';
import { ui } from '../core/presentation';
import {
  showSignalCountdowns,
  type ProgressProfile,
  type ProgressStore,
} from '../core/progressStore';

export function applyAccessibility(profile: ProgressProfile) {
  const html = document.documentElement;
  html.dataset.textSize = profile.resultsTextSize ?? 'medium';
  html.toggleAttribute('data-contrast', profile.resultsHighContrast ?? false);
  html.toggleAttribute('data-reduced-effects', profile.reducedEffects);
}

export function accessibilityPreferences(
  store: ProgressStore,
  reduce?: () => void,
) {
  const labels = ui.missionResults;
  const size = document.createElement('label');
  size.className = 'ride-preference';
  const select = document.createElement('select');
  for (const key of ['medium', 'large', 'largest'] as const)
    select.add(new Option(labels[key], key));
  select.value = store.profile.resultsTextSize ?? 'medium';
  select.addEventListener('change', () => {
    const value = select.value;
    if (value !== 'medium' && value !== 'large' && value !== 'largest') return;
    store.change((profile) => {
      profile.resultsTextSize = value;
    });
    applyAccessibility(store.profile);
  });
  size.append(labels.textSize, select);
  const options = [
    size,
    preference(store, labels.highContrast, 'resultsHighContrast'),
    preference(store, ui.settings.reducedEffects, 'reducedEffects', reduce),
  ];
  if (hasHaptics)
    options.push(preference(store, ui.settings.haptics, 'haptics'));
  return options;
}

export function ridePreference(store: ProgressStore, key: 'reflectiveVest') {
  return preference(store, ui.settings[key], key);
}

export function signalCountdownPreference(store: ProgressStore, exam = false) {
  const key = exam ? 'examSignalCountdowns' : 'signalCountdowns';
  return preference(
    store,
    ui.settings.signalCountdowns,
    key,
    undefined,
    showSignalCountdowns(store.profile, exam),
  );
}

function preference(
  store: ProgressStore,
  text: string,
  key:
    | 'resultsHighContrast'
    | 'reducedEffects'
    | 'reflectiveVest'
    | 'haptics'
    | 'signalCountdowns'
    | 'examSignalCountdowns',
  onEnable?: () => void,
  checked = store.profile[key] ?? key === 'haptics',
) {
  const label = document.createElement('label');
  label.className = 'ride-preference';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => {
    const checked = input.checked;
    store.change((profile) => {
      profile[key] = checked;
    });
    applyAccessibility(store.profile);
    if (checked) onEnable?.();
  });
  label.append(input, text);
  return label;
}
