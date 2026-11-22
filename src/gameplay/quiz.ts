import { z } from 'zod';
import type { GameContent } from '../content/schemas';
import { masteryWeight, type ModuleId } from '../progression/mastery';

export type QuizQuestion = GameContent['pytania']['pytania'][number];
type QuizBalance = GameContent['balans'];
const boxes = [1, 2, 3, 4, 5] as const;
const nextBox = [2, 3, 4, 5, 5] as const;
const count = z.number().int().nonnegative();
const cardSchema = z.strictObject({
  box: z.literal(boxes),
  dueDay: count,
});

export const quizProgressSchema = z.strictObject({
  day: count,
  lastDay: z.iso.date().optional(),
  cards: z.record(z.string().regex(/^Q\d+$/), cardSchema),
  streak: count,
});

type QuizProgress = z.infer<typeof quizProgressSchema>;
type Card = z.infer<typeof cardSchema>;

export function emptyQuizProgress(): QuizProgress {
  return { day: 0, cards: {}, streak: 0 };
}

export function advanceQuizDay(progress: QuizProgress, date: string) {
  if (!progress.lastDay || date > progress.lastDay) {
    progress.day++;
    progress.lastDay = date;
  }
}

export function isQuizCardDue(progress: QuizProgress, id: string) {
  return (progress.cards[id]?.dueDay ?? 0) <= progress.day;
}

export function reviewQuizCard(
  previous: Card | undefined,
  correct: boolean,
  day: number,
  intervals: QuizBalance['leitner_odstepy_dni'],
): Card {
  const box = correct ? nextBox[(previous?.box ?? 1) - 1]! : 1;
  return { box, dueDay: day + intervals[box - 1]! };
}

export function drawQuizQuestions(
  content: Pick<GameContent, 'pytania' | 'balans'>,
  progress: QuizProgress,
  mastery: (ruleId: string) => number,
  seed: number,
  module?: ModuleId,
) {
  const candidates = content.pytania.pytania
    .filter(
      (q) => (!module || q.modul === module) && isQuizCardDue(progress, q.id),
    )
    .map((question) => ({
      question,
      weight:
        question.przepisy.reduce(
          (total, rule) =>
            total + masteryWeight(mastery(rule), content.balans.mastery),
          0,
        ) / question.przepisy.length,
    }));
  const selection: QuizQuestion[] = [];
  const limit = module
    ? candidates.length
    : content.balans.quiz.szybkie_pytania;
  let total = candidates.reduce((sum, { weight }) => sum + weight, 0);
  while (selection.length < limit && candidates.length) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    let remaining = (seed / 2 ** 32) * total;
    let index = 0;
    while (
      index < candidates.length - 1 &&
      remaining >= candidates[index]!.weight
    ) {
      remaining -= candidates[index]!.weight;
      index++;
    }
    const { question, weight } = candidates.splice(index, 1)[0]!;
    total -= weight;
    selection.push(question);
  }
  return selection;
}
