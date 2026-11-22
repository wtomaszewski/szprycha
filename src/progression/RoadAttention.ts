import type { GameContent } from '../content/schemas';
import { TICKS_PER_SECOND, type Verdict } from '../rules/types';

export type ControlQuestion = GameContent['pytania']['pytania'][number];

export class RoadAttention {
  level = 0;
  pending?: ControlQuestion;
  private cleanTicks = 0;
  private readonly decayTicks: number;
  private readonly byRule = new Map<string, ControlQuestion[]>();
  private readonly questionIndex = new Map<string, number>();

  constructor(
    private readonly balance: GameContent['balans']['uwaga_drogowki'],
    questions: readonly ControlQuestion[],
  ) {
    this.decayTicks = Math.ceil(balance.spadek_co_s * TICKS_PER_SECOND);
    for (const question of questions) {
      for (const rule of question.przepisy) {
        const candidates = this.byRule.get(rule);
        if (candidates) candidates.push(question);
        else this.byRule.set(rule, [question]);
      }
    }
  }

  step(verdicts: readonly Pick<Verdict, 'kind' | 'ruleId'>[], moving: boolean) {
    if (this.pending) return;
    let violation = false;
    for (const { kind, ruleId } of verdicts) {
      if (kind === 'good') continue;
      violation = true;
      this.level =
        kind === 'major'
          ? this.balance.max
          : Math.min(
              this.balance.max,
              this.level + this.balance.przyrost_minor,
            );
      if (this.level === this.balance.max) {
        const questions = this.byRule.get(ruleId);
        if (!questions?.length)
          throw new Error(`No control question for ${ruleId}`);
        const index = this.questionIndex.get(ruleId) ?? 0;
        this.pending = questions[index];
        this.questionIndex.set(ruleId, (index + 1) % questions.length);
        break;
      }
    }
    if (violation) this.cleanTicks = 0;
    else if (moving && this.level > 0 && ++this.cleanTicks >= this.decayTicks) {
      this.level--;
      this.cleanTicks = 0;
    }
  }

  answer(index: number) {
    const question = this.pending;
    if (
      !question ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= question.odpowiedzi.length
    )
      return;
    const correct = index === question.poprawna;
    this.level = correct ? 0 : this.balance.po_blednej_odpowiedzi;
    this.pending = undefined;
    return { correct, points: correct ? this.balance.bonus_madra_glowa : 0 };
  }
}
