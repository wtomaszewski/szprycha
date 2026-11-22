import type { GameContent } from '../content/schemas';
import {
  applyScoreVerdict,
  comboMultiplier,
} from '../progression/missionScore';
import type { Verdict } from '../rules/types';
import type { DrivingHudStats } from './DrivingHud';

type Balance = Pick<
  GameContent['balans'],
  'misja' | 'combo' | 'uwaga_drogowki'
>;

/** Bridge from the current verdict stream to the HUD until progression owns these values. */
export class VerdictHudStats {
  private readonly tally = { points: 0, streak: 0 };
  private lastPenalty = 0;
  readonly view: DrivingHudStats = { points: 0, combo: 1, attention: 0 };

  constructor(private readonly balance: Balance) {}

  receive({ kind, at }: Verdict) {
    applyScoreVerdict(this.balance, this.tally, kind);
    this.view.points = this.tally.points;
    this.view.combo = comboMultiplier(this.balance.combo, this.tally.streak);
    this.advance(at);
    if (kind === 'good') return;
    const max = this.balance.uwaga_drogowki.max;
    this.view.attention =
      kind === 'major' ? max : Math.min(max, this.view.attention + 1);
    this.lastPenalty = at;
  }

  advance(at: number) {
    if (this.view.attention === 0) return;
    const interval = this.balance.uwaga_drogowki.spadek_co_s;
    const decay = Math.floor((at - this.lastPenalty) / interval);
    if (decay <= 0) return;
    this.view.attention = Math.max(0, this.view.attention - decay);
    this.lastPenalty += decay * interval;
  }
}
