import { z } from 'zod';
import { classId } from '../content/classes';
import { rankingScore, rankingWeek } from '../content/rankings';

export const rankingQueueLimit = 50;
const awardLimit = 128;

const weekly = z.strictObject({
  week: rankingWeek,
  version: z.string(),
  xp: z.number().nonnegative(),
  sentXp: z.number().nonnegative().default(0),
  priorXp: z.number().nonnegative(),
  awards: z.array(z.number().positive()).max(awardLimit),
});

export const rankingState = z.strictObject({
  consent: z.uint32(),
  queue: z.array(rankingScore).max(rankingQueueLimit),
  weekly: weekly.optional(),
  deleting: z.boolean().optional(),
  classMemberId: classId.optional().catch(undefined),
});
export type RankingState = z.infer<typeof rankingState>;
export type WeeklyXp = z.infer<typeof weekly>;

const warsaw = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function rankingWeekStart(now: Date) {
  const parts = Object.fromEntries(
    warsaw.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function addWeeklyXp(
  state: RankingState,
  version: string,
  delta: number,
  at: number,
) {
  if (delta <= 0) return;
  const week = rankingWeekStart(new Date(at));
  const previous = state.weekly;
  if (previous && week < previous.week) return;
  if (previous?.week !== week || previous.version !== version)
    state.weekly = { week, version, xp: 0, sentXp: 0, priorXp: 0, awards: [] };
  const entry = state.weekly!;
  entry.xp += delta;
  entry.awards.push(delta);
  if (entry.awards.length > awardLimit) entry.priorXp += entry.awards.shift()!;
}
