import { z } from 'zod';
import { helmetColors } from '../render/spriteFrames.ts';
import { missionCity } from './missions.ts';
import { isGeneratedNickname, maxNicknameLength } from './nicknames.ts';

export const rankingProfileId = z.uuidv4().transform((id) => id.toLowerCase());
export const rankingIdentity = z.strictObject({
  nickname: z.string().max(maxNicknameLength).refine(isGeneratedNickname),
  avatarId: z.enum(helmetColors),
});

export const rankingWeek = z.iso.date();
export const rankingLeague = z.enum(['bronze', 'silver', 'gold']);
export const rankingMissionId = z
  .string()
  .regex(/^(WAW|WRO)-(T|A[1-3]|B)-\d{2}$/);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const count = z.number().int().nonnegative();
const duration = z.number().int().min(1);
const ride = {
  ticks: duration,
  good: count,
  minor: count,
  major: count,
  longestSeries: count,
  cleanMeters: count,
  speedPercent: z.literal(100),
};
const evidence = { seed: z.uint32(), version: sha256, inputHash: sha256 };

export const rankingScore = z.discriminatedUnion('kind', [
  z.strictObject({
    ...evidence,
    ...ride,
    kind: z.literal('mission'),
    city: missionCity,
    missionId: rankingMissionId,
    points: z.number().int(),
  }),
  z.strictObject({
    ...evidence,
    ...ride,
    kind: z.literal('ride'),
    city: missionCity,
  }),
  z.strictObject({
    ...evidence,
    kind: z.literal('plac'),
    ticks: duration,
    minor: count,
    major: count,
    speedPercent: z.literal(100),
  }),
  z.strictObject({
    ...evidence,
    kind: z.literal('weekly-xp'),
    week: rankingWeek,
    xp: z.number().min(0.5).multipleOf(0.5).max(1_000_000),
  }),
]);

export const rankingSubmission = z.strictObject({
  ...rankingIdentity.shape,
  score: rankingScore,
});

export const rankingQuery = z.discriminatedUnion('board', [
  z.strictObject({
    board: z.literal('mission'),
    city: missionCity,
    missionId: rankingMissionId,
  }),
  z.strictObject({ board: z.literal('weekly-xp'), league: rankingLeague }),
  z.strictObject({ board: z.literal('safety') }),
  z.strictObject({ board: z.literal('plac') }),
  z.strictObject({ board: z.literal('cities') }),
  // A class board can add its own scoped query and membership in M10d.
]);

export type RankingSubmission = z.infer<typeof rankingSubmission>;
export type RankingScore = z.infer<typeof rankingScore>;
export type RankingQuery = z.infer<typeof rankingQuery>;
export type RankingLeague = z.infer<typeof rankingLeague>;
