import { expect, it } from 'vitest';
import {
  bicycleBells,
  sampleRate,
  synthesize,
  type Effect,
} from '../../src/audio/effects';
import { polishVoice } from '../../src/audio/Narrator';
import { scores, sequence } from '../../src/audio/score';
import {
  channelLevel,
  channels,
  defaultAudio,
  stations,
} from '../../src/audio/settings';
import { textAt } from '../../src/content/translation';
import pl from '../../i18n/pl.json';
import { readContent } from '../../tools/content';

it('mixes the three channel levels independently and only ducks the music', () => {
  const settings = { ...defaultAudio, effects: 0.3, voice: 0.42 };
  expect(channels.map((channel) => channelLevel(settings, channel))).toEqual([
    0.6, 0.3, 0.42,
  ]);
  expect(channelLevel(settings, 'music', true)).toBeCloseTo(0.156);
  expect(channelLevel(settings, 'effects', true)).toBe(0.3);
  expect(channelLevel(settings, 'voice', true)).toBe(0.42);
  expect(channelLevel({ ...settings, readAloud: false }, 'voice')).toBe(0);
  expect(
    channels.map((channel) =>
      channelLevel({ ...settings, muted: true }, channel),
    ),
  ).toEqual([0, 0, 0]);
});

it('generates distinct, bounded effects and reproduces seeded samples exactly', () => {
  const names: Effect[] = [
    ...bicycleBells,
    'brake',
    'cobbles',
    'tram',
    'rail',
    'crossing',
    'siren',
    'pigeon',
    'peacock',
    'oops',
    'stars',
    'unlock',
    'phone',
  ];
  const unique = new Set<string>();
  for (const name of names) {
    const samples = synthesize(name, 123);
    const repeat = synthesize(name, 123);
    expect(Buffer.from(samples.buffer).equals(Buffer.from(repeat.buffer))).toBe(
      true,
    );
    expect(samples.every((value) => Math.abs(value) <= 1)).toBe(true);
    expect(samples.some((value) => Math.abs(value) > 0.05)).toBe(true);
    unique.add(Buffer.from(samples.buffer).toString('base64'));
  }
  expect(unique.size).toBe(names.length);
  expect(synthesize('brake', 1)[77]).not.toBe(synthesize('brake', 2)[77]);
  expect(synthesize('siren', 123)).toHaveLength(1.5 * sampleRate);
});

it('converts MIDI notes, rests and repeated tracks to audio-clock seconds', () => {
  const { duration, notes } = sequence({
    bpm: 120,
    beats: 4,
    tracks: [
      {
        wave: 'triangle',
        stepBeats: 1,
        level: 0.2,
        gate: 0.5,
        steps: [69, null, 81, 57],
      },
      { wave: 'sine', stepBeats: 2, level: 0.1, gate: 0.9, steps: [45] },
    ],
  });
  expect(duration).toBe(2);
  expect(notes.map(({ hz, start, duration }) => [hz, start, duration])).toEqual(
    [
      [440, 0, 0.25],
      [110, 0, 0.9],
      [880, 1, 0.25],
      [110, 1, 0.9],
      [220, 1.5, 0.25],
    ],
  );
  for (const station of stations) {
    const loop = sequence(scores[station]);
    expect(loop.notes.length).toBeGreaterThan(20);
    expect(
      loop.notes.every((note) => note.start + note.duration <= loop.duration),
    ).toBe(true);
  }
});

it('selects only a Polish system voice and prefers pl-PL', () => {
  const voice = (
    lang: string,
    localService: boolean,
  ): SpeechSynthesisVoice => ({
    lang,
    localService,
    name: lang,
    voiceURI: lang,
    default: false,
  });
  const online = voice('pl-PL', false);
  const english = voice('en-US', true);
  const polish = voice('pl-PL', true);
  const generic = voice('pl', true);
  expect(polishVoice([online, english])).toBeUndefined();
  expect(polishVoice([online, generic, polish])).toBe(polish);
  expect(polishVoice([online, generic])).toBe(generic);
});

it('localizes each broadcast tip and ties it to an existing rule', async () => {
  const { przepisy } = await readContent();
  for (const tip of pl.audio.tips) {
    expect(przepisy.przepisy.some(({ id }) => id === tip.rule)).toBe(true);
    expect(textAt(pl, tip.text)).toBeTruthy();
    expect(textAt(pl, tip.text)!.length).toBeLessThanOrEqual(140);
  }
});
