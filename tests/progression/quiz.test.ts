import { expect, it } from 'vitest';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import {
  advanceQuizDay,
  drawQuizQuestions,
  emptyQuizProgress,
  isQuizCardDue,
  reviewQuizCard,
} from '../../src/gameplay/quiz';
import { readContent } from '../../tools/content';

const content = await readContent();
const intervals = content.balans.leitner_odstepy_dni;

it('promotes through five Leitner boxes and resets a mistake to the first', () => {
  const two = reviewQuizCard(undefined, true, 1, intervals);
  const three = reviewQuizCard(two, true, 2, intervals);
  const four = reviewQuizCard(three, true, 5, intervals);
  const five = reviewQuizCard(four, true, 12, intervals);
  expect([two, three, four, five]).toEqual([
    { box: 2, dueDay: 2 },
    { box: 3, dueDay: 5 },
    { box: 4, dueDay: 12 },
    { box: 5, dueDay: 26 },
  ]);
  expect(reviewQuizCard(five, true, 26, intervals)).toEqual({
    box: 5,
    dueDay: 40,
  });
  expect(reviewQuizCard(five, false, 26, intervals)).toEqual({
    box: 1,
    dueDay: 26,
  });
});

it('counts one session day per local date and does not count days away', () => {
  const quiz = emptyQuizProgress();
  advanceQuizDay(quiz, '2026-11-22');
  quiz.cards.Q001 = { box: 3, dueDay: 4 };
  for (const day of ['2026-11-22', '2026-11-21', '2026-11-28', '2026-11-29'])
    advanceQuizDay(quiz, day);
  expect(quiz.day).toBe(3);
  expect(isQuizCardDue(quiz, 'Q001')).toBe(false);
  advanceQuizDay(quiz, '2026-12-01');
  expect(isQuizCardDue(quiz, 'Q001')).toBe(true);
});

it('draws unique due questions deterministically for quick and module modes', () => {
  const quiz = emptyQuizProgress();
  quiz.cards.Q024 = { box: 2, dueDay: 1 };
  const draw = (seed: number) =>
    drawQuizQuestions(content, quiz, () => 0, seed);
  const quick = draw(42);
  expect(quick).toEqual(draw(42));
  expect(quick).not.toEqual(draw(2026));
  expect(new Set(quick.map(({ id }) => id)).size).toBe(10);
  const module = drawQuizQuestions(content, quiz, () => 0, 42, 'M03');
  expect(module.every(({ modul }) => modul === 'M03')).toBe(true);
  expect(module.map(({ id }) => id)).toContain('Q062');
  expect(module.map(({ id }) => id)).not.toContain('Q024');
});

it('resets the streak on a mistake and unlocks the award once after twenty correct answers', async () => {
  const progress = new MissionProgress();
  const [question, ...rest] = content.pytania.pytania;
  const date = '2026-11-22';
  await progress.recordStudyAnswer(content, question!, true, date);
  await progress.recordStudyAnswer(content, rest[0]!, false, date);
  expect(progress.store.profile.quiz.streak).toBe(0);
  expect(progress.store.profile.quiz.cards[rest[0]!.id]).toEqual({
    box: 1,
    dueDay: 1,
  });
  for (const entry of rest.slice(0, 21)) {
    await progress.recordStudyAnswer(content, entry, true, date);
    if (progress.store.profile.quiz.streak === 19)
      expect(progress.tokens).toBe(0);
  }
  const achievement = content.osiagniecia.osiagniecia.find(
    ({ id }) => id === 'madra_glowa',
  )!;
  expect(progress.tokens).toBe(achievement.zetony);
  expect(progress.store.profile.achievementXp.madra_glowa).toBe(
    achievement.zetony * content.balans.osiagniecia.xp_za_zeton,
  );
});

it('subtracts mastery when a previously learned card is answered incorrectly', async () => {
  const progress = new MissionProgress();
  const question = content.pytania.pytania.find(({ id }) => id === 'Q048')!;
  await progress.recordStudyAnswer(content, question, true, '2026-11-22');
  await progress.recordStudyAnswer(content, question, false, '2026-11-23');
  expect(progress.ruleMastery('MSC-05')).toBe(
    content.balans.mastery.quiz_ok + content.balans.mastery.quiz_zle,
  );
});
