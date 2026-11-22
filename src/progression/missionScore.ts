import type { GameContent } from '../content/schemas';
import type { Verdict } from '../rules/types';
import { SafetySeries } from './SafetySeries.ts';

type ScoreBalance = Pick<GameContent['balans'], 'misja' | 'combo'>;
type Timing = { par_s: number; limit_s?: number };

export class MissionScore {
  points = 0;
  goodHabits = 0;
  minor = 0;
  major = 0;
  longest = 0;
  private consecutive = 0;
  private readonly series: SafetySeries;

  constructor(
    private readonly balance: ScoreBalance,
    initialStreak = 0,
  ) {
    this.series = new SafetySeries(balance.combo, initialStreak);
  }

  receive(kind: Verdict['kind']) {
    const { misja } = this.balance;
    if (kind === 'good') {
      this.goodHabits++;
      this.consecutive++;
      this.longest = Math.max(this.longest, this.consecutive);
      this.points += misja.dobry_nawyk * this.series.multiplier;
    } else {
      this[kind]++;
      this.consecutive = 0;
      this.points -= kind === 'major' ? misja.kara_major : misja.kara_minor;
    }
    this.series.receive(kind);
  }

  get tooManyMajor() {
    return this.major >= this.balance.misja.major_do_porazki;
  }

  result(
    mission: Timing,
    elapsed: number,
    completed: boolean,
    shocks?: number,
  ) {
    const { misja } = this.balance;
    const timeBonus =
      completed && this.major === 0
        ? Math.round(
            misja.bonus_czasu_max *
              (elapsed <= mission.par_s
                ? 1
                : mission.limit_s !== undefined && elapsed < mission.limit_s
                  ? (mission.limit_s - elapsed) /
                    (mission.limit_s - mission.par_s)
                  : 0),
          )
        : 0;
    const smoothBonus =
      completed &&
      shocks !== undefined &&
      shocks < misja.prog_wstrzasow_plynnosc
        ? misja.bonus_plynnosci
        : 0;
    const points =
      this.points +
      (completed ? misja.ukonczenie : 0) +
      timeBonus +
      smoothBonus;
    return { points, timeBonus, smoothBonus };
  }
}

export function missionScore(
  balance: ScoreBalance,
  mission: Timing,
  elapsed: number,
  verdicts: readonly Verdict[],
  completed: boolean,
  shocks?: number,
) {
  const score = new MissionScore(balance);
  for (const { kind } of verdicts) score.receive(kind);
  return score.result(mission, elapsed, completed, shocks);
}
