import { z } from 'zod';
import { rankingMissionId, type RankingScore } from '../content/rankings.ts';
import { missionCity } from '../content/missions.ts';

const version = z.object({ version: z.string().regex(/^[0-9a-f]{64}$/) });
export const rankingVersions = z.object({
  missions: z.record(rankingMissionId, version.extend({ city: missionCity })),
  ride: z.strictObject({ warszawa: version, wroclaw: version }),
  plac: version,
  weeklyXp: version,
});

export type RankingVersions = z.infer<typeof rankingVersions>;

export function versionFor(
  versions: RankingVersions,
  score:
    | Pick<
        Extract<RankingScore, { kind: 'mission' }>,
        'kind' | 'city' | 'missionId'
      >
    | Pick<Extract<RankingScore, { kind: 'ride' }>, 'kind' | 'city'>
    | { kind: 'plac' | 'weekly-xp' },
) {
  if (score.kind === 'mission') {
    const mission = versions.missions[score.missionId];
    return mission?.city === score.city ? mission.version : undefined;
  }
  if (score.kind === 'ride') return versions.ride[score.city].version;
  return score.kind === 'plac'
    ? versions.plac.version
    : versions.weeklyXp.version;
}
