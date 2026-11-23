import { describe, expect, it } from 'vitest';
import { MissionScore, missionScore } from '../../src/progression/missionScore';
import { SafetySeries } from '../../src/progression/SafetySeries';
import type { Verdict } from '../../src/rules/types';
import { readContent } from '../../tools/content';

const { balans } = await readContent();
const timing = { par_s: 20, limit_s: 60 };

it('itemizes bonuses, the safety combo, penalties and a control answer without changing the total', () => {
  const score = new MissionScore(balans);
  for (const kind of ['good', 'good', 'good', 'good', 'minor', 'good'] as const)
    score.receive(kind);
  score.answerQuestion(100);

  expect(score.result(timing, 40, true, 0.2)).toEqual({
    points: 1700,
    completionPoints: 1000,
    habitPoints: 300,
    penaltyPoints: 150,
    questionPoints: 100,
    timeBonus: 250,
    smoothBonus: 200,
  });
  score.receive('major');
  expect(score.result(timing, 40, true, 0.2)).toMatchObject({
    points: 1150,
    penaltyPoints: 450,
    timeBonus: 0,
  });
});
const good: Verdict = {
  kind: 'good',
  ruleId: 'ZNAK-STOP',
  at: 0,
  pos: { x: 0, y: 0 },
  evidence: {},
  feedbackKey: 'przepisy.ZNAK-STOP.feedback',
};
const verdicts = (...kinds: Verdict['kind'][]) =>
  kinds.map((kind) => ({ ...good, kind }));

describe('docs/04 §2 — mission score', () => {
  it.each([
    { name: 'completion', input: [], completed: true, expected: 1000 },
    { name: 'no completion', input: [], completed: false, expected: 0 },
    {
      name: 'good habit',
      input: verdicts('good'),
      completed: true,
      expected: 1050,
    },
    { name: 'minor', input: verdicts('minor'), completed: true, expected: 850 },
    { name: 'major', input: verdicts('major'), completed: true, expected: 700 },
    {
      name: 'unfinished run',
      input: verdicts('good', 'major'),
      completed: false,
      expected: -250,
    },
  ])('$name', ({ input, completed, expected }) => {
    expect(missionScore(balans, timing, 60, input, completed).points).toBe(
      expected,
    );
  });

  it.each([
    { elapsed: 19, input: [], completed: true, bonus: 500 },
    { elapsed: 20, input: [], completed: true, bonus: 500 },
    { elapsed: 21, input: [], completed: true, bonus: 488 },
    { elapsed: 40, input: [], completed: true, bonus: 250 },
    { elapsed: 59, input: [], completed: true, bonus: 13 },
    { elapsed: 60, input: [], completed: true, bonus: 0 },
    { elapsed: 61, input: [], completed: true, bonus: 0 },
    { elapsed: 10, input: verdicts('minor'), completed: true, bonus: 500 },
    { elapsed: 10, input: verdicts('major'), completed: true, bonus: 0 },
    { elapsed: 10, input: [], completed: false, bonus: 0 },
  ])(
    'time bonus at $elapsed s is $bonus ($input)',
    ({ elapsed, input, completed, bonus }) => {
      const result = missionScore(balans, timing, elapsed, input, completed);
      expect(result.timeBonus).toBe(bonus);
      expect(result.points).toBe(
        missionScore(balans, timing, 60, input, completed).points + bonus,
      );
    },
  );

  it.each([
    { elapsed: 20, bonus: 500 },
    { elapsed: 21, bonus: 0 },
  ])('untimed mission at $elapsed s', ({ elapsed, bonus }) => {
    expect(
      missionScore(balans, { par_s: 20 }, elapsed, [], true).timeBonus,
    ).toBe(bonus);
  });

  it.each([
    { shocks: undefined, completed: true, bonus: 0 },
    { shocks: 0, completed: true, bonus: 200 },
    { shocks: 0.29999, completed: true, bonus: 200 },
    { shocks: 0.3, completed: true, bonus: 0 },
    { shocks: 0.30001, completed: true, bonus: 0 },
    { shocks: 0, completed: false, bonus: 0 },
  ])(
    'smoothness at $shocks (completed = $completed)',
    ({ shocks, completed, bonus }) => {
      const result = missionScore(balans, timing, 60, [], completed, shocks);
      expect(result.smoothBonus).toBe(bonus);
      expect(result.points).toBe((completed ? 1000 : 0) + bonus);
    },
  );

  it('reaches the campaign failure threshold on the first major', () => {
    const score = new MissionScore(balans);
    for (const kind of ['good', 'minor'] as const) score.receive(kind);
    expect(score.tooManyMajor).toBe(false);
    score.receive('major');
    expect(score.tooManyMajor).toBe(true);
  });
});

describe('docs/04 §3 — Safety Series', () => {
  it('raises the multiplier after each third good verdict and caps it at ×5', () => {
    const series = new SafetySeries(balans.combo);
    const score = new MissionScore(balans);
    expect(series.multiplier).toBe(1);
    expect(series.glowing).toBe(false);
    let last = 0;
    const earned = [];
    for (let i = 1; i <= 16; i++) {
      score.receive('good');
      series.receive('good');
      earned.push(score.points - last);
      last = score.points;
      if (i === 5) expect(series.glowing).toBe(false);
      if (i === 6) {
        expect(series.multiplier).toBe(3);
        expect(series.glowing).toBe(true);
      }
      if (i === 11) expect(series.multiplier).toBe(4);
      if (i >= 12) expect(series.multiplier).toBe(5);
    }
    expect(earned).toEqual([
      50, 50, 50, 100, 100, 100, 150, 150, 150, 200, 200, 200, 250, 250, 250,
      250,
    ]);
    expect(series.longest).toBe(16);
  });

  it.each(['minor', 'major'] as const)(
    'resets current series on %s and keeps the record',
    (kind) => {
      const series = new SafetySeries(balans.combo, 6, 11);
      const score = new MissionScore(balans, series.consecutive);
      score.receive('good');
      expect(score.points).toBe(150);
      for (const entry of ['good', kind, 'good'] as const)
        series.receive(entry);
      expect(series.multiplier).toBe(1);
      expect(series.glowing).toBe(false);
      expect(series.longest).toBe(11);
      score.receive(kind);
      const afterPenalty = score.points;
      score.receive('good');
      expect(score.points - afterPenalty).toBe(50);
      expect(score.longest).toBe(1);
    },
  );

  it('applies adjusted balancing data', () => {
    const custom = structuredClone(balans);
    Object.assign(custom.combo, {
      mnoznik_startowy: 2,
      krok_dobrych_nawykow: 1,
      max_mnoznik: 3,
    });
    Object.assign(custom.misja, {
      dobry_nawyk: 21,
      kara_minor: 13,
      major_do_porazki: 1,
    });
    const score = new MissionScore(custom);
    for (const kind of ['good', 'good', 'minor', 'good'] as const)
      score.receive(kind);
    expect(score.points).toBe(42 + 63 - 13 + 42);
    score.receive('major');
    expect(score.tooManyMajor).toBe(true);
  });
});
