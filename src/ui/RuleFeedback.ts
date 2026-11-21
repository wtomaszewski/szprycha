import type { GameContent } from '../content/schemas';
import { ui } from '../core/presentation';
import type { RuleEngine } from '../rules/RuleEngine';
import type { Verdict } from '../rules/types';

export class RuleFeedback {
  private readonly counts = document.createElement('output');
  private readonly bubble = document.createElement('p');
  private readonly text: Map<string, string>;
  private readonly pending: Verdict[] = [];
  private until = 0;

  constructor(parent: HTMLElement, rules: GameContent['przepisy']['przepisy']) {
    this.text = new Map(
      rules.map(({ id, feedback }) => [`przepisy.${id}.feedback`, feedback]),
    );
    this.counts.className = 'rule-counts';
    this.counts.setAttribute('aria-label', ui.rules.counts);
    this.counts.setAttribute('aria-live', 'off');
    this.bubble.className = 'rule-feedback';
    this.bubble.setAttribute('role', 'status');
    this.bubble.hidden = true;
    parent.append(this.counts, this.bubble);
  }

  explanation(verdict: Verdict) {
    const text =
      this.text.get(verdict.feedbackKey) ??
      this.text.get(`przepisy.${verdict.ruleId}.feedback`);
    if (!text) return '';
    const first =
      new Intl.Segmenter('pl', { granularity: 'sentence' })
        .segment(text)
        [Symbol.iterator]()
        .next()
        .value?.segment.trim() ?? '';
    return first.length <= 140
      ? first
      : `${first.slice(0, 139).replace(/\s+\S*$/, '')}…`;
  }

  receive(verdict: Verdict, counts: RuleEngine['counts'], review: boolean) {
    this.showCounts(counts);
    if (verdict.kind === 'good' || review) return;
    this.pending.push(verdict);
    if (this.pending.length > 3) this.pending.pop();
  }

  reset(counts: RuleEngine['counts']) {
    this.pending.length = 0;
    this.bubble.hidden = true;
    this.showCounts(counts);
  }

  private showCounts({ good, minor, major }: RuleEngine['counts']) {
    this.counts.textContent = `${ui.rules.good} ${good} · ${ui.rules.minor} ${minor} · ${ui.rules.major} ${major}`;
  }

  update(at: number) {
    const next = this.pending[0];
    if (
      next &&
      (this.bubble.hidden ||
        at >= this.until ||
        (next.kind === 'major' && this.bubble.dataset.kind === 'minor'))
    ) {
      this.pending.shift();
      const text = this.text.get(next.feedbackKey);
      if (text) {
        this.bubble.hidden = false;
        this.bubble.textContent = text;
        this.bubble.dataset.kind = next.kind;
        this.until = at + 3;
      }
    }
    if (!this.bubble.hidden && at >= this.until) this.bubble.hidden = true;
  }
}
