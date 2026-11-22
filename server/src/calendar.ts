import { z } from 'zod';

const day = 86_400_000;
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dateKey = (time: number) => new Date(time).toISOString().slice(0, 10);

export const seasonSettings = z.strictObject({
  anchor: z.iso.date(),
  weeks: z.number().int().min(1).max(52),
});
export type SeasonSettings = z.infer<typeof seasonSettings>;

export function rankingCalendar(now: Date, { anchor, weeks }: SeasonSettings) {
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  // Use UTC solely for arithmetic on Warsaw calendar dates, including DST weeks.
  const localDay = Date.parse(`${parts.year}-${parts.month}-${parts.day}`);
  const weekday = (new Date(localDay).getUTCDay() + 6) % 7;
  const weekStart = localDay - weekday * day;
  const origin = Date.parse(anchor);
  const length = weeks * 7 * day;
  const start = origin + Math.floor((localDay - origin) / length) * length;
  const season = { start: dateKey(start), end: dateKey(start + length) };
  return {
    week: dateKey(weekStart),
    season,
    seasonKey: season.start + '/' + season.end,
  };
}

export type RankingCalendar = ReturnType<typeof rankingCalendar>;
