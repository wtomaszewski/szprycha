import type { GameContent } from '../content/schemas';
import type { Verdict } from '../rules/types';

type ComboBalance = GameContent['balans']['combo'];

export function seriesMultiplier(balance: ComboBalance, consecutive: number) {
  return Math.min(
    balance.max_mnoznik,
    balance.mnoznik_startowy +
      Math.floor(consecutive / balance.krok_dobrych_nawykow),
  );
}

export class SafetySeries {
  constructor(
    private readonly balance: ComboBalance,
    public consecutive = 0,
    public longest = 0,
  ) {}

  get multiplier() {
    return seriesMultiplier(this.balance, this.consecutive);
  }

  get glowing() {
    return this.multiplier >= this.balance.efekt_od_mnoznika;
  }

  receive(kind: Verdict['kind']) {
    this.consecutive = kind === 'good' ? this.consecutive + 1 : 0;
    this.longest = Math.max(this.longest, this.consecutive);
  }
}
