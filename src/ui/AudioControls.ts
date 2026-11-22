import { audio } from '../audio/GameAudio';
import { channels, stations, type AudioSettings } from '../audio/settings';
import { ui } from '../core/presentation';
import type { ProgressStore } from '../core/progressStore';

export function setAudio<Key extends keyof AudioSettings>(
  store: ProgressStore,
  key: Key,
  value: AudioSettings[Key],
) {
  if (store.profile.audio[key] === value) return;
  store.change((profile) => {
    profile.audio[key] = value;
  });
  audio.configure(store.profile.audio);
}

export function audioSettings(store: ProgressStore) {
  const group = document.createElement('fieldset');
  group.className = 'audio-settings';
  const legend = document.createElement('legend');
  legend.textContent = ui.audio.settings;
  group.append(legend);

  const labelFor = (name: string, input: HTMLElement) => {
    const label = document.createElement('label');
    label.append(name, input);
    group.append(label);
    return label;
  };
  for (const channel of channels) {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(store.profile.audio[channel] * 100));
    const value = document.createElement('span');
    value.setAttribute('aria-hidden', 'true');
    const updateValue = () => {
      value.textContent = `${input.value}%`;
      input.setAttribute('aria-valuetext', value.textContent);
    };
    updateValue();
    input.addEventListener('input', () => {
      updateValue();
      setAudio(store, channel, input.valueAsNumber / 100);
    });
    labelFor(ui.audio[channel], input).append(value);
  }
  for (const option of ['muted', 'readAloud'] as const) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = store.profile.audio[option];
    input.addEventListener('change', () =>
      setAudio(store, option, input.checked),
    );
    labelFor(ui.audio[option], input);
  }
  const station = document.createElement('select');
  for (const id of stations) station.add(new Option(ui.audio.stations[id], id));
  station.value = store.profile.audio.station;
  station.addEventListener('change', () => {
    const selected = stations.find((id) => id === station.value);
    if (selected) setAudio(store, 'station', selected);
  });
  labelFor(ui.audio.station, station);

  const bell = document.createElement('select');
  const variants = [0, 1, 2] as const;
  for (const id of variants)
    bell.add(new Option(ui.audio.bells[id], String(id)));
  bell.value = String(store.profile.audio.bell);
  bell.addEventListener('change', () => {
    const selected = variants.find((id) => String(id) === bell.value);
    if (selected === undefined) return;
    setAudio(store, 'bell', selected);
    audio.ringBell();
  });
  labelFor(ui.audio.bell, bell);

  return group;
}

export function radioControls(store: ProgressStore) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = ui.audio.fm;
  const stationName = document.createElement('span');
  stationName.className = 'radio-station';
  stationName.setAttribute('aria-live', 'polite');
  stationName.setAttribute('aria-atomic', 'true');
  const caption = document.createElement('p');
  caption.className = 'radio-caption';
  caption.hidden = true;
  caption.setAttribute('role', 'status');
  const refresh = () => {
    const name = ui.audio.stations[store.profile.audio.station];
    stationName.textContent = name;
    button.title = `${ui.audio.changeStation} · ${name}`;
    button.setAttribute('aria-label', button.title);
  };
  button.addEventListener('click', () => {
    const index = stations.indexOf(store.profile.audio.station);
    setAudio(store, 'station', stations[(index + 1) % stations.length]!);
    refresh();
  });
  audio.setCaption((text) => {
    caption.textContent = text;
    caption.hidden = !text;
  });
  refresh();
  const widget = document.createElement('div');
  widget.className = 'radio';
  widget.append(button, stationName, caption);
  return { widget, refresh };
}
