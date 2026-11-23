import { expect, it } from 'vitest';
import {
  bicycleBells,
  sampleRate,
  synthesize,
  type Effect,
} from '../../src/audio/effects';
import { radioCatalog } from '../../src/audio/radio/catalog';
import { compose, stationJingle } from '../../src/audio/radio/compose';
import {
  sampleRate as radioRate,
  synthesizeScore,
} from '../../tools/radio/synthesize';
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
    'missionFailed',
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

it('composes six distinct deterministic arrangements per station with bounded song lengths', () => {
  const allSeeds = new Set<number>();
  const melodies = new Set<string>();
  for (const station of stations) {
    const { seeds } = radioCatalog[station];
    expect(seeds).toHaveLength(6);
    for (const seed of seeds) {
      allSeeds.add(seed);
      const score = compose(station, seed);
      expect(compose(station, seed)).toEqual(score);
      expect(score.duration).toBeCloseTo((24 * 4 * 60) / score.bpm);
      expect(score.duration).toBeGreaterThan(36);
      expect(score.duration).toBeLessThanOrEqual(96);
      expect(
        score.sections.map(({ name, bar, bars }) => [name, bar, bars]),
      ).toEqual([
        ['intro', 0, 2],
        ['verse', 2, 4],
        ['chorus', 6, 4],
        ['verse', 10, 4],
        ['bridge', 14, 2],
        ['chorus', 16, 4],
        ['outro', 20, 4],
      ]);
      for (const [i, note] of score.notes.entries()) {
        expect(note.start).toBeGreaterThanOrEqual(
          score.notes[i - 1]?.start ?? 0,
        );
        expect(note.duration).toBeGreaterThan(0);
        expect(note.start + note.duration).toBeLessThanOrEqual(
          score.duration + 1e-8,
        );
      }
      const chorus = score.notes.filter(
        ({ start, pitch }) =>
          pitch > 0 &&
          start >= (24 * 60) / score.bpm &&
          start < (40 * 60) / score.bpm,
      );
      melodies.add(
        chorus
          .map(
            ({ start, pitch }) =>
              `${((start * score.bpm) / 60).toFixed(3)}:${pitch}`,
          )
          .join(','),
      );
      expect(new Set(chorus.map(({ pitch }) => pitch)).size).toBeGreaterThan(3);
      expect(score.notes.some(({ patch }) => patch === 'kick')).toBe(true);
    }
  }
  expect(allSeeds.size).toBe(36);
  expect(melodies.size).toBe(36);
});

it('synthesizes six distinct station idents with reproducible PCM and finite audio', () => {
  const jingles = new Set<string>();
  for (const station of stations) {
    const score = stationJingle(station);
    const pcm = synthesizeScore(score, 0);
    expect(pcm).toHaveLength(Math.ceil(score.duration * radioRate));
    expect(score.duration).toBeCloseTo(2.083, 3);
    expect(pcm.every(Number.isFinite)).toBe(true);
    expect(pcm.some((value) => Math.abs(value) > 0.1)).toBe(true);
    const bytes = Buffer.from(pcm.buffer);
    expect(bytes.equals(Buffer.from(synthesizeScore(score, 0).buffer))).toBe(
      true,
    );
    jingles.add(bytes.toString('base64'));
  }
  expect(jingles.size).toBe(6);
});

it('localizes each broadcast tip and ties it to an existing rule', async () => {
  const { przepisy } = await readContent();
  for (const tip of pl.audio.tips) {
    expect(przepisy.przepisy.some(({ id }) => id === tip.rule)).toBe(true);
    expect(textAt(pl, tip.text)).toBeTruthy();
    expect(textAt(pl, tip.text)!.length).toBeLessThanOrEqual(140);
  }
});
