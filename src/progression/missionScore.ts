import type { GameContent } from '../content/schemas';
import type { Verdict } from '../rules/types';

type ScoreBalance = Pick<GameContent['balans'], 'misja' | 'combo'>;

export function comboMultiplier(
  { max_mnoznik, krok_dobrych_nawykow }: ScoreBalance['combo'],
  streak: number,
) {
  return Math.min(max_mnoznik, 1 + Math.floor(streak / krok_dobrych_nawykow));
}

export function applyScoreVerdict(
  { misja, combo }: ScoreBalance,
  score: { points: number; streak: number },
  kind: Verdict['kind'],
) {
  if (kind === 'good') {
    score.points += misja.dobry_nawyk * comboMultiplier(combo, score.streak);
    score.streak++;
  } else {
    score.points -= kind === 'major' ? misja.kara_major : misja.kara_minor;
    score.streak = 0;
  }
}

export function missionScore(
  balance: ScoreBalance,
  mission: { par_s: number; limit_s?: number },
  elapsed: number,
  verdicts: readonly Verdict[],
  completed: boolean,
  shocks?: number,
) {
  const { misja } = balance;
  const tally = { points: completed ? misja.ukonczenie : 0, streak: 0 };
  let major = false;
  for (const { kind } of verdicts) {
    applyScoreVerdict(balance, tally, kind);
    major ||= kind === 'major';
  }
  const timeBonus =
    completed && !major
      ? Math.round(
          misja.bonus_czasu_max *
            (elapsed <= mission.par_s
              ? 1
              : mission.limit_s && elapsed < mission.limit_s
                ? (mission.limit_s - elapsed) /
                  (mission.limit_s - mission.par_s)
                : 0),
        )
      : 0;
  const smoothBonus =
    completed && shocks !== undefined && shocks < misja.prog_wstrzasow_plynnosc
      ? misja.bonus_plynnosci
      : 0;
  return {
    points: tally.points + timeBonus + smoothBonus,
    timeBonus,
    smoothBonus,
  };
}
