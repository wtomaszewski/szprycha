import { expect, it } from 'vitest';
import { RoadAttention } from '../../src/progression/RoadAttention';
import { TICKS_PER_SECOND } from '../../src/rules/types';
import { readContent } from '../../tools/content';

const { balans, pytania } = await readContent();
const stop = { kind: 'minor', ruleId: 'ZNAK-STOP' } as const;
const sidewalk = { kind: 'minor', ruleId: 'GDZIE-04' } as const;
const redLight = { kind: 'major', ruleId: 'SYG-01' } as const;
const clean = { ...stop, kind: 'good' } as const;
const ticksInMinute = 60 * TICKS_PER_SECOND;
const createAttention = () =>
  new RoadAttention(balans.uwaga_drogowki, pytania.pytania);
const ride = (attention: RoadAttention, ticks: number, moving = true) => {
  for (let i = 0; i < ticks; i++) attention.step([clean], moving);
};

it('docs/04 §4 — starts at 0 and asks about the violation that raises the counter to 3', () => {
  const attention = createAttention();
  expect(attention.level).toBe(0);
  attention.step([stop], true);
  expect(attention.level).toBe(1);
  attention.step([stop], true);
  expect(attention.level).toBe(2);
  expect(attention.pending).toBeUndefined();
  attention.step([sidewalk, redLight], true);
  expect(attention.level).toBe(3);
  expect(attention.pending?.przepisy).toContain(sidewalk.ruleId);
  ride(attention, ticksInMinute * 2);
  expect(attention.level).toBe(3);
});

it('raises any major straight to 3 and grants Mądra Głowa only once', () => {
  const attention = createAttention();
  attention.step([redLight], true);
  expect(attention.level).toBe(3);
  expect(attention.pending?.przepisy).toContain(redLight.ruleId);
  expect(attention.answer(-1)).toBeUndefined();
  expect(attention.answer(0.5)).toBeUndefined();
  expect(
    attention.answer(attention.pending!.odpowiedzi.length),
  ).toBeUndefined();
  expect(attention.level).toBe(3);
  const index = attention.pending!.poprawna;
  expect(attention.answer(index)).toEqual({ correct: true, points: 100 });
  expect(attention.level).toBe(0);
  expect(attention.pending).toBeUndefined();
  expect(attention.answer(index)).toBeUndefined();
});

it('returns the counter to 1 after a wrong answer and rotates matching questions', () => {
  const attention = createAttention();
  const ruleId = 'KASK-01';
  const helmet = { kind: 'major', ruleId } as const;
  const questions = pytania.pytania.filter(({ przepisy }) =>
    przepisy.includes(ruleId),
  );
  for (const expected of [...questions, questions[0]!]) {
    attention.step([helmet], true);
    expect(attention.pending).toEqual(expected);
    expect(expected.wyjasnienie).toBeTruthy();
    const wrong = (expected.poprawna + 1) % expected.odpowiedzi.length;
    expect(attention.answer(wrong)).toEqual({ correct: false, points: 0 });
    expect(attention.level).toBe(1);
    expect(attention.pending).toBeUndefined();
  }
});

it('subtracts a level every 60 simulation seconds of clean movement and stays at 0', () => {
  const attention = createAttention();
  attention.step([stop, stop], true);
  ride(attention, ticksInMinute - 1);
  expect(attention.level).toBe(2);
  ride(attention, ticksInMinute, false);
  expect(attention.level).toBe(2);
  attention.step([], true);
  expect(attention.level).toBe(1);
  ride(attention, ticksInMinute - 1);
  expect(attention.level).toBe(1);
  attention.step([], true);
  expect(attention.level).toBe(0);
  ride(attention, ticksInMinute);
  expect(attention.level).toBe(0);
});

it('starts a fresh clean interval after a violation or a control question', () => {
  const attention = createAttention();
  attention.step([stop], true);
  ride(attention, ticksInMinute - 1);
  attention.step([stop], true);
  ride(attention, ticksInMinute - 1);
  expect(attention.level).toBe(2);
  attention.step([redLight], true);
  const question = attention.pending!;
  attention.answer((question.poprawna + 1) % question.odpowiedzi.length);
  ride(attention, ticksInMinute - 1);
  expect(attention.level).toBe(1);
  attention.step([], true);
  expect(attention.level).toBe(0);
});
