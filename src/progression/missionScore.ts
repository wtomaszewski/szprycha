import type { GameContent } from '../content/schemas';
import type { Verdict } from '../rules/types';

export function missionScore(
  balance: Pick<GameContent['balans'], 'misja' | 'combo'>,
  mission: { par_s: number; limit_s?: number },
  elapsed: number,
  verdicts: readonly Verdict[],
  completed: boolean,
  shocks?: number,
) {
  const { misja, combo } = balance;
  let points = completed ? misja.ukonczenie : 0;
  let streak = 0;
  let major = false;
  for (const { kind } of verdicts) {
    if (kind === 'good') {
      points +=
        misja.dobry_nawyk *
        Math.min(
          combo.max_mnoznik,
          1 + Math.floor(streak / combo.krok_dobrych_nawykow),
        );
      streak++;
    } else {
      points -= kind === 'major' ? misja.kara_major : misja.kara_minor;
      major ||= kind === 'major';
      streak = 0;
    }
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
  return { points: points + timeBonus + smoothBonus, timeBonus, smoothBonus };
}
