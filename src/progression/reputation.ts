import type { GameContent } from '../content/schemas';
import type { ProgressProfile } from '../core/progressStore';

type Ranks = GameContent['balans']['rangi'];

export function reputationXp(profile: ProgressProfile) {
  return (
    profile.missionPoints / 2 +
    profile.quizXp +
    Object.values(profile.achievementXp).reduce((sum, xp) => sum + xp, 0)
  );
}

export function reputationRank(
  ranks: Ranks,
  xp: number,
  licencePassed: boolean,
) {
  let rank: Ranks[number] | undefined;
  for (const candidate of ranks) {
    if (candidate.xp === null) {
      if (licencePassed) return candidate;
    } else if (candidate.xp <= xp && candidate.xp > (rank?.xp ?? -1)) {
      rank = candidate;
    }
  }
  return rank;
}

export function rankUnlocks(
  ranks: Ranks,
  xp: number,
  licencePassed: boolean,
  licenceMasteryMet: boolean,
) {
  return new Set(
    ranks
      .filter((rank) => (rank.xp === null ? licencePassed : xp >= rank.xp))
      .flatMap((rank) => rank.odblokuj)
      .filter(
        (flag) =>
          flag !== 'egzamin_licencji' || licenceMasteryMet || licencePassed,
      ),
  );
}
