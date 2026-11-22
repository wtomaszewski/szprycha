import { IDBFactory } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import { ProgressStore } from '../../src/core/progressStore';
import { FIXED_STEP } from '../../src/gameplay/bicycle';
import {
  placIds,
  scorePlac,
  type Ghost,
  type GhostPose,
} from '../../src/gameplay/plac/PlacRun';
import {
  placCourseKey,
  placRecordsSchema,
  playGhost,
  rankPlac,
} from '../../src/gameplay/plac/placRecords';
import { readContent } from '../../tools/content';

const {
  plac,
  balans: { plac: balance },
} = await readContent();
const key = placCourseKey(plac, balance);
const track = (ticks: number) => ({
  ticks,
  poses: Array.from(
    { length: Math.floor(ticks / 4) + 1 },
    (_, i): GhostPose => [i * 4, 0, i * 0.1],
  ),
});
const ghost = (total: number): Ghost =>
  placIds.map((_, i) => track(i === 0 ? total - 5 * 4 : 4));

it('uses inclusive time boundaries and excludes incomplete runs', () => {
  const results = placIds.map((id) => ({
    id,
    grade: 'good' as const,
    ticks: 1,
    faults: new Map<never, never>(),
  }));
  for (const medal of ['gold', 'silver', 'bronze'] as const) {
    results[0]!.ticks = Math.round(balance.medals_s[medal] / FIXED_STEP) - 5;
    expect(scorePlac(results, balance, 0.9).medal).toBe(medal);
  }
  results[0]!.ticks++;
  expect(scorePlac(results, balance, 0.9).medal).toBeUndefined();
  expect(scorePlac(results.slice(1), balance, 0.9).medal).toBeUndefined();
});

it('keeps the fastest trace, deterministically replays it, and ranks only clean times', () => {
  const fastest = ghost(40);
  const start = rankPlac(
    undefined,
    key,
    balance,
    { ticks: 60, clean: true },
    ghost(60),
  );
  const ranked = rankPlac(
    start,
    key,
    balance,
    { ticks: 40, clean: true },
    fastest,
  )!;
  expect(
    rankPlac(ranked, key, balance, { ticks: 36, clean: false }, ghost(36)),
  ).toBe(ranked);
  expect(
    rankPlac(ranked, key, balance, { ticks: 40, clean: true }, ghost(40))
      ?.ghost,
  ).toBe(fastest);
  const limited = rankPlac(
    ranked,
    key,
    { ...balance, ranking_limit: 2 },
    { ticks: 50, clean: true },
    ghost(50),
  )!;
  expect(limited.times).toEqual([40, 50]);
  expect(placRecordsSchema.parse(limited).ghost).toEqual(fastest);
  const pose: GhostPose = [0, 0, 0];
  expect(playGhost(fastest[0]!, 6, pose)).toBe(true);
  expect(pose).toEqual([6, 0, expect.closeTo(0.15)]);
  expect(playGhost(fastest[0]!, 21, pose)).toBe(false);
  const changed = placCourseKey({ ...plac, width: plac.width + 1 }, balance);
  expect(
    rankPlac(ranked, changed, balance, { ticks: 60, clean: true }, ghost(60))
      ?.times,
  ).toEqual([60]);
});

it('stores a ranking and replay across browser sessions without discarding the old profile', async () => {
  const database = new IDBFactory();
  const first = await ProgressStore.open(database);
  const withoutPlac = { ...first.profile };
  const second = await ProgressStore.open(database);
  first.change((p) => {
    p.plac = rankPlac(
      p.plac,
      key,
      balance,
      { ticks: 80, clean: true },
      ghost(80),
    )!;
  });
  second.change((p) => {
    p.plac = rankPlac(
      p.plac,
      key,
      balance,
      { ticks: 40, clean: true },
      ghost(40),
    )!;
  });
  await Promise.all([first.flush(), second.flush()]);
  const reloaded = await ProgressStore.open(database);
  expect(reloaded.reset).toBe(false);
  expect(reloaded.profile).toMatchObject(withoutPlac);
  expect(reloaded.profile.plac?.times).toEqual([40, 80]);
  expect(reloaded.profile.plac?.ghost).toEqual(ghost(40));
});
