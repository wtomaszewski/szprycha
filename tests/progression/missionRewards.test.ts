import { expect, it } from 'vitest';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import {
  missionStars,
  tokensForImprovement,
} from '../../src/progression/missionRewards';
import { readContent } from '../../tools/content';

const { balans, misje } = await readContent();
const balance = balans.gwiazdki;
const mission = { par_s: 30, min_dobre_nawyki: 3 };

it.each([
  {
    completed: false,
    minor: 0,
    major: 0,
    elapsed: 29,
    goodHabits: 3,
    stars: 0,
  },
  { completed: true, minor: 0, major: 1, elapsed: 29, goodHabits: 3, stars: 1 },
  { completed: true, minor: 2, major: 0, elapsed: 29, goodHabits: 3, stars: 1 },
  { completed: true, minor: 1, major: 0, elapsed: 29, goodHabits: 3, stars: 2 },
  {
    completed: true,
    minor: 0,
    major: 0,
    elapsed: 30.01,
    goodHabits: 3,
    stars: 2,
  },
  { completed: true, minor: 0, major: 0, elapsed: 30, goodHabits: 2, stars: 2 },
  { completed: true, minor: 0, major: 0, elapsed: 30, goodHabits: 3, stars: 3 },
  { completed: true, minor: 0, major: 0, elapsed: 29, goodHabits: 4, stars: 3 },
])(
  'docs/04 §6 — $stars stars with $minor minor, $major major, $elapsed s, $goodHabits habits (completed = $completed)',
  ({ completed, elapsed, stars, ...score }) => {
    expect(missionStars(balance, mission, elapsed, completed, score)).toBe(
      stars,
    );
  },
);

it.each([
  [0, 0, 0],
  [0, 1, 10],
  [0, 2, 20],
  [0, 3, 35],
  [1, 2, 10],
  [1, 3, 25],
  [2, 3, 15],
  [3, 3, 0],
  [3, 2, 0],
  [2, 0, 0],
] as const)('pays %i → %i stars as %i tokens', (previous, earned, tokens) => {
  expect(tokensForImprovement(balance, previous, earned)).toBe(tokens);
});

it('extends a legacy profile and restores the record, payouts and per-mission best on reload', () => {
  const [first, second] = misje;
  let data = JSON.stringify({ completed: [first!.id] });
  const storage = {
    getItem: () => data,
    setItem: (_key: string, value: string) => {
      data = value;
    },
  };
  let progress = new MissionProgress(storage);
  expect(progress.longestSeries).toBe(0);
  expect(progress.tokens).toBe(0);
  progress.recordSeries(8);
  progress.recordSeries(2);
  expect(progress.complete(first!, { stars: 1, balance })).toBe(10);
  expect(progress.complete(second!, { stars: 2, balance })).toBe(20);
  progress = new MissionProgress(storage);
  expect(progress.longestSeries).toBe(8);
  expect(progress.tokens).toBe(30);
  expect(progress.complete(first!, { stars: 3, balance })).toBe(25);
  expect(progress.complete(first!, { stars: 3, balance })).toBe(0);
  expect(progress.complete(first!, { stars: 2, balance })).toBe(0);
  expect(new MissionProgress(storage).tokens).toBe(55);
});
