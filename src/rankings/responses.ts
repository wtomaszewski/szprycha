import { z } from 'zod';
import { missionCity } from '../content/missions';
import {
  rankingIdentity,
  rankingLeague,
  rankingWeek,
} from '../content/rankings';

const placement = z.object({
  position: z.number().int().positive(),
  value: z.number(),
});
const player = placement.extend(rankingIdentity.shape);
const city = placement.extend({ city: missionCity });
const period = {
  week: rankingWeek,
  season: z.object({ start: rankingWeek, end: rankingWeek }),
};

export const playerBoard = z.object({
  ...period,
  top: z.array(player).max(50),
  self: player.nullable(),
});
export const cityBoard = z.object({
  ...period,
  top: z.array(city).max(2),
  self: z
    .array(city.extend({ contributedMeters: z.number().nonnegative() }))
    .max(2),
});
export const leagues = z.object({
  week: rankingWeek,
  leagues: z.array(rankingLeague),
  league: rankingLeague.nullable(),
});
