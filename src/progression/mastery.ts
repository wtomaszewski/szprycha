import type { GameContent } from '../content/schemas';
import type { ProgressProfile } from '../core/progressStore';
import type { Verdict } from '../rules/types';

type Balance = GameContent['balans']['mastery'];
type Mastery = ProgressProfile['mastery'];
export type ModuleId = GameContent['przepisy']['przepisy'][number]['modul'];

const maxMastery = 100;

export function localDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function applyMastery(
  mastery: Mastery,
  ruleId: string,
  kind: Verdict['kind'] | 'quiz_ok' | 'quiz_zle',
  balance: Balance,
  day: string,
) {
  const previous = Object.hasOwn(mastery, ruleId) ? mastery[ruleId] : undefined;
  const entry = previous ?? { value: 0, goodToday: 0 };
  let delta = balance[kind];
  if (kind === 'good') {
    // Do not reopen the daily allowance if the wall clock goes backwards.
    if (!entry.goodDay || day > entry.goodDay) {
      entry.goodDay = day;
      entry.goodToday = 0;
    }
    delta = Math.min(delta, balance.good_limit_dzienny - entry.goodToday);
    delta = Math.max(0, Math.min(delta, maxMastery - entry.value));
    entry.goodToday += delta;
  }
  entry.value = Math.max(0, Math.min(maxMastery, entry.value + delta));
  mastery[ruleId] = entry;
}

export function moduleMastery(mastery: Mastery, rules: readonly string[]) {
  if (!rules.length) return 0;
  return (
    rules.reduce((sum, id) => sum + (mastery[id]?.value ?? 0), 0) / rules.length
  );
}

export function masteryWeight(value: number, balance: Balance) {
  return maxMastery - value + balance.waga_bazowa;
}

export function masteryBadge(value: number, { progi_odznak: levels }: Balance) {
  if (value >= levels.zloto) return 'zloto';
  if (value >= levels.srebro) return 'srebro';
  if (value >= levels.braz) return 'braz';
  return 'brak';
}
