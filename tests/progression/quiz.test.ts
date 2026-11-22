import { IDBFactory } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import { ProgressStore } from '../../src/core/progressStore';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import {
  answerOrder,
  drawQuestions,
  dueQuestions,
  reviewCard,
} from '../../src/gameplay/quiz/leitner';
import { readContent } from '../../tools/content';

const content = await readContent();
const questions = content.pytania.pytania;
const { balans } = content;
const day = '2026-03-29';

it('advances through five boxes, keeps the last box and makes a miss immediately due', () => {
  const answer = (box?: number, correct = true) =>
    reviewCard(
      box ? { box, due: day } : undefined,
      correct,
      day,
      balans.leitner_odstepy_dni,
    );
  expect(answer()).toEqual({ box: 2, due: '2026-03-30' });
  expect(answer(1)).toEqual({ box: 2, due: '2026-03-30' });
  expect(answer(2)).toEqual({ box: 3, due: '2026-04-01' });
  expect(answer(3)).toEqual({ box: 4, due: '2026-04-05' });
  expect(answer(4)).toEqual({ box: 5, due: '2026-04-12' });
  expect(answer(5)).toEqual({ box: 5, due: '2026-04-12' });
  expect(answer(5, false)).toEqual({ box: 1, due: day });
});

it('draws due reviews before new questions, deterministically and without repeats', () => {
  const cards = {
    Q002: { box: 5, due: '2026-04-12' },
    Q003: { box: 2, due: day },
  };
  const available = dueQuestions(questions, cards, day);
  expect(available.find(({ id }) => id === 'Q002')).toBeUndefined();
  expect(
    dueQuestions(questions, cards, '2026-04-12').find(
      ({ id }) => id === 'Q002',
    ),
  ).toBeDefined();
  const draw = (seed: number, pool = available) =>
    drawQuestions(
      pool,
      cards,
      () => 0,
      balans.mastery,
      seed,
      balans.quiz.szybki_pytan,
    );
  const picked = draw(23);
  expect(picked).toEqual(draw(23, [...available].reverse()));
  expect(picked).not.toEqual(draw(24));
  expect(new Set(picked.map(({ id }) => id)).size).toBe(
    balans.quiz.szybki_pytan,
  );
  expect(picked[0]?.id).toBe('Q003');
  const order = answerOrder(picked[0]!, 23);
  expect(order).toEqual(answerOrder(picked[0]!, 23));
  expect([...order].sort()).toEqual(
    picked[0]!.odpowiedzi.map((_, index) => index),
  );
});

it('applies quiz-only and cross-module mastery and persists misses and promotion in IndexedDB', async () => {
  const factory = new IDBFactory();
  const progress = new MissionProgress(await ProgressStore.open(factory));
  const q062 = questions.find(({ id }) => id === 'Q062')!;
  const q006 = questions.find(({ id }) => id === 'Q006')!;
  progress.answerPracticeQuestion(content, q062, q062.poprawna, day);
  progress.answerPracticeQuestion(content, q006, q006.poprawna, day);
  await progress.store.flush();
  const next = new MissionProgress(await ProgressStore.open(factory));
  expect(next.moduleMastery('M03', content)).toBeGreaterThan(0);
  expect(next.ruleMastery('ZNAK-P23')).toBe(15);
  expect(next.ruleMastery('MSC-04')).toBe(15);
  expect(next.store.profile.quiz).toEqual({
    cards: {
      Q062: { box: 2, due: '2026-03-30' },
      Q006: { box: 2, due: '2026-03-30' },
    },
    streak: 2,
  });
  expect(
    next.answerPracticeQuestion(content, q062, 1, '2026-03-30').card,
  ).toEqual({ box: 1, due: '2026-03-30' });
  expect(next.ruleMastery('ZNAK-P23')).toBe(10);
  await next.store.flush();
  const reloaded = await ProgressStore.open(factory);
  expect(reloaded.profile.quiz).toEqual(next.store.profile.quiz);
  expect(reloaded.profile.quiz.streak).toBe(0);
  expect(reloaded.profile.quizXp).toBe(2 * balans.quiz.xp_za_poprawna);
});

it('unlocks Mądra Głowa once for 20 practice answers across reloads', async () => {
  const factory = new IDBFactory();
  const progress = new MissionProgress(await ProgressStore.open(factory));
  for (const question of questions.slice(0, 19))
    progress.answerPracticeQuestion(content, question, question.poprawna, day);
  progress.recordControlAnswer('ZNAK-STOP', true, balans.mastery);
  await progress.store.flush();

  const next = new MissionProgress(await ProgressStore.open(factory));
  expect(next.store.profile.quiz.streak).toBe(19);
  expect(next.store.profile.achievementXp).not.toHaveProperty('madra_glowa');
  const twentieth = questions[19]!;
  expect(
    next
      .answerPracticeQuestion(content, twentieth, twentieth.poprawna, day)
      .achievements.map(({ id }) => id),
  ).toEqual(['madra_glowa']);
  const another = questions[20]!;
  expect(
    next.answerPracticeQuestion(content, another, another.poprawna, day)
      .achievements,
  ).toEqual([]);
  await next.store.flush();
  const saved = (await ProgressStore.open(factory)).profile;
  expect(saved.progression.tokens).toBe(40);
  expect(saved.achievementXp.madra_glowa).toBe(
    40 * balans.osiagniecia.xp_za_zeton,
  );
});
