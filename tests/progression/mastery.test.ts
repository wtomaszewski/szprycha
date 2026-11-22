import { expect, it } from 'vitest';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import {
  masteryBadge,
  masteryWeight,
  moduleMastery,
} from '../../src/progression/mastery';
import { readContent } from '../../tools/content';

const content = await readContent();
const balance = content.balans.mastery;
const stop = 'ZNAK-STOP';
const good = { ruleId: stop, kind: 'good' } as const;
const minor = { ruleId: stop, kind: 'minor' } as const;
const major = { ruleId: stop, kind: 'major' } as const;
const day = '2026-11-21';

it('limits good gains to 30 per rule and local day independently of penalties and quiz', () => {
  const progress = new MissionProgress();
  progress.recordRide([good, good, good, good, minor, good], 4, balance, day);
  expect(progress.ruleMastery(stop)).toBe(20);
  progress.recordRide([{ ...good, ruleId: 'MAN-01' }], 5, balance, day);
  expect(progress.ruleMastery('MAN-01')).toBe(10);
  progress.recordQuizAnswer(stop, true, balance);
  expect(progress.ruleMastery(stop)).toBe(35);
  progress.recordRide([good], 5, balance, '2026-11-20');
  expect(progress.ruleMastery(stop)).toBe(35);
  progress.recordRide([good], 6, balance, '2026-11-22');
  expect(progress.ruleMastery(stop)).toBe(45);
});

it('applies verdict and quiz deltas and caps mastery at 0 and 100', () => {
  const progress = new MissionProgress();
  progress.recordRide([major], 0, balance, day);
  expect(progress.ruleMastery(stop)).toBe(0);
  for (let i = 0; i < 8; i++) progress.recordQuizAnswer(stop, true, balance);
  expect(progress.ruleMastery(stop)).toBe(100);
  progress.recordRide([minor, major], 0, balance, day);
  expect(progress.ruleMastery(stop)).toBe(70);
  progress.recordQuizAnswer(stop, false, balance);
  expect(progress.ruleMastery(stop)).toBe(65);
  progress.recordControlAnswer(stop, false, balance);
  expect(progress.ruleMastery(stop)).toBe(65);
  progress.recordControlAnswer(stop, true, balance);
  expect(progress.ruleMastery(stop)).toBe(80);
  progress.recordRide([major, major, major, major, major], 0, balance, day);
  expect(progress.ruleMastery(stop)).toBe(0);
});

it('averages all module rules including the ones the player has not practiced', () => {
  const progress = new MissionProgress();
  progress.recordRide([good, good, good], 3, balance, day);
  const rules = content.przepisy.przepisy.filter(
    ({ modul }) => modul === 'M03',
  );
  expect(progress.moduleMastery('M03', content)).toBe(30 / rules.length);
  expect(progress.moduleMastery('M08', content)).toBe(0);
  expect(moduleMastery({}, [])).toBe(0);
});

it('weights weaker rules more often and keeps mastered rules eligible', () => {
  expect(
    [0, 40, 70, 100].map((value) => masteryWeight(value, balance)),
  ).toEqual([110, 70, 40, 10]);
  const progress = new MissionProgress();
  progress.recordRide([good], 1, balance, day);
  expect(progress.eventWeight(stop, balance)).toBe(100);
  expect(progress.eventWeight('MAN-01', balance)).toBe(110);
});

it.each([
  [39.99, 'brak'],
  [40, 'braz'],
  [69.99, 'braz'],
  [70, 'srebro'],
  [89.99, 'srebro'],
  [90, 'zloto'],
] as const)('gives mastery %s the %s badge', (value, badge) => {
  expect(masteryBadge(value, balance)).toBe(badge);
});
