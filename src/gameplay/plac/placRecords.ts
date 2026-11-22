import { z } from 'zod';
import type { PlacBalance } from '../../content/plac';
import { FIXED_STEP } from '../bicycle';
import { ghostInterval, placIds, type Ghost } from './PlacRun';

export { placCourseKey } from './courseKey';

const ticks = z.number().int().positive();
export const placRecordsSchema = z
  .strictObject({
    course: z.string().max(32_000),
    times: z
      .array(ticks)
      .min(1)
      .max(20)
      .refine((times) => times.every((time, i) => !i || time > times[i - 1]!)),
    ghost: z
      .array(
        z
          .strictObject({
            ticks,
            poses: z
              .array(z.tuple([z.number(), z.number(), z.number()]))
              .min(1)
              .max(1801),
          })
          .refine(
            ({ ticks, poses }) =>
              poses.length === Math.floor(ticks / ghostInterval) + 1,
          ),
      )
      .length(placIds.length),
  })
  .refine(
    ({ times, ghost }) =>
      times[0] === ghost.reduce((sum, track) => sum + track.ticks, 0),
  );

export type PlacRecords = z.infer<typeof placRecordsSchema>;

export function rankPlac(
  previous: PlacRecords | undefined,
  course: string,
  balance: PlacBalance,
  score: { clean: boolean; ticks: number },
  ghost: Ghost,
) {
  if (!score.clean) return previous;
  const current = previous?.course === course ? previous : undefined;
  return {
    course,
    times: [...new Set([...(current?.times ?? []), score.ticks])]
      .sort((a, b) => a - b)
      .slice(0, balance.ranking_limit),
    ghost: !current || score.ticks < current.times[0]! ? ghost : current.ghost,
  } satisfies PlacRecords;
}

export function playGhost(
  ghost: Ghost[number],
  tick: number,
  position: Ghost[number]['poses'][number],
) {
  if (tick > ghost.ticks) return false;
  const time = tick / ghostInterval;
  const i = Math.floor(time);
  const first = ghost.poses[i]!;
  const next = ghost.poses[i + 1] ?? first;
  const alpha = time - i;
  position[0] = first[0] + (next[0] - first[0]) * alpha;
  position[1] = first[1] + (next[1] - first[1]) * alpha;
  position[2] = first[2] + (next[2] - first[2]) * alpha;
  return true;
}

const number = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const placTime = (ticks: number) => number.format(ticks * FIXED_STEP);
