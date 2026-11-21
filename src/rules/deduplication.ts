import type { Verdict } from './types';

const weight = { good: 0, minor: 1, major: 2 };
const groups = [
  ['GDZIE-09', 'ZNAK-B9'],
  ['MSC-03', 'PIER-06'],
  ['MSC-04', 'WYP-04', 'WYP-05'],
  ['ZNAK-STOP', 'PIER-02', 'ZNAK-A7'],
] as const;
const priority = new Map<string, number>();
for (const group of groups)
  group.forEach((id, index) => priority.set(id, -index));

/** Candidates must describe the same episode. */
export function preferVerdict(a: Verdict | undefined, b: Verdict | undefined) {
  if (!a || !b) return a ?? b;
  const difference =
    weight[a.kind] - weight[b.kind] ||
    (priority.get(a.ruleId) ?? 0) - (priority.get(b.ruleId) ?? 0);
  return difference >= 0 ? a : b;
}
