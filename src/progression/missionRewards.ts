import type { GameContent } from '../content/schemas';

export type Stars = 0 | 1 | 2 | 3;

export function missionStars(
  balance: GameContent['balans']['gwiazdki'],
  mission: { par_s: number; min_dobre_nawyki: number; premia_czasowa?: false },
  elapsed: number,
  completed: boolean,
  score: { minor: number; major: number; goodHabits: number },
): Stars {
  if (!completed) return 0;
  if (score.major > 0 || score.minor > balance.dwie_gwiazdki_max_minor)
    return 1;
  return score.minor === 0 &&
    (mission.premia_czasowa === false || elapsed <= mission.par_s) &&
    score.goodHabits >= mission.min_dobre_nawyki
    ? 3
    : 2;
}

export function tokensForImprovement(
  balance: GameContent['balans']['gwiazdki'],
  previous: Stars,
  earned: Stars,
) {
  if (earned <= previous) return 0;
  const payout = (stars: Stars) => balance.zetony[stars - 1] ?? 0;
  return payout(earned) - payout(previous);
}
