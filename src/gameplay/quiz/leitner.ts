import type { GameContent } from '../../content/schemas';
import { masteryWeight } from '../../progression/mastery';

export type QuizQuestion = GameContent['pytania']['pytania'][number];
export const leitnerBoxes = 5;
export type QuizCard = { box: number; due: string };
type Balance = GameContent['balans'];

export function reviewCard(
  previous: QuizCard | undefined,
  correct: boolean,
  day: string,
  intervals: Balance['leitner_odstepy_dni'],
): QuizCard {
  const box = correct ? Math.min((previous?.box ?? 1) + 1, leitnerBoxes) : 1;
  // ISO dates represent local calendar days. Add days in UTC to avoid DST gaps.
  const due = new Date(`${day}T00:00:00Z`);
  due.setUTCDate(due.getUTCDate() + intervals[box - 1]!);
  return { box, due: due.toISOString().slice(0, 10) };
}

function random(seed: number, text: string) {
  let hash = (2166136261 ^ seed) >>> 0;
  for (const char of text)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return (((hash ^ (hash >>> 16)) >>> 0) + 1) / (2 ** 32 + 1);
}

export function dueQuestions(
  questions: readonly QuizQuestion[],
  cards: Readonly<Record<string, QuizCard>>,
  day: string,
) {
  return questions.filter(({ id }) => !cards[id] || cards[id].due <= day);
}

export function drawQuestions(
  questions: readonly QuizQuestion[],
  cards: Readonly<Record<string, QuizCard>>,
  mastery: (ruleId: string) => number,
  balance: Balance['mastery'],
  seed: number,
  limit = questions.length,
) {
  return questions
    .map((question) => {
      const weight = masteryWeight(
        Math.min(...question.przepisy.map(mastery)),
        balance,
      );
      return {
        question,
        isNew: Number(!cards[question.id]),
        // Exponential draws give a weighted order without replacement.
        order: -Math.log(random(seed, question.id)) / weight,
      };
    })
    .sort(
      (a, b) =>
        a.isNew - b.isNew ||
        a.order - b.order ||
        a.question.id.localeCompare(b.question.id, 'en'),
    )
    .slice(0, limit)
    .map(({ question }) => question);
}

export function answerOrder(question: QuizQuestion, seed: number) {
  return question.odpowiedzi
    .map((_, index) => index)
    .sort(
      (a, b) =>
        random(seed, `${question.id}:${a}`) -
          random(seed, `${question.id}:${b}`) || a - b,
    );
}
