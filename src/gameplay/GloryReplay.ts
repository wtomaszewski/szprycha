import type { Verdict } from '../rules/types';
import { TICKS_PER_SECOND } from '../rules/types';
import { type ReplayBuffer, type ReplayFrame } from './ReplayBuffer';

// Prefer an explicit safety decision involving other road users, then a
// visible stop, then preparation and positioning. Order breaks ties across rules.
const habits = [
  'PIER-04',
  'PIER-07',
  'PIER-09',
  'PIER-03',
  'PIER-02',
  'PIER-01',
  'PIER-08',
  'PIER-06',
  'MSC-02',
  'MSC-03',
  'MSC-01',
  'GDZIE-06',
  'SYG-01',
  'ZNAK-STOP',
  'ZNAK-S2',
  'PIER-05',
  'GDZIE-05',
  'MAN-04',
  'MAN-01',
  'MAN-03',
  'MAN-07',
  'MAN-11',
  'MAN-06',
  'GDZIE-01',
  'MSC-04',
  'WYP-04',
  'WYP-06',
];

const lead = 2 * TICKS_PER_SECOND;
const minimum = TICKS_PER_SECOND;
// Allow time for an overlapping, still unresolved manoeuvre to emit a verdict.
const guard = 3 * TICKS_PER_SECOND;
const tickAt = (at: number) => Math.round(at * TICKS_PER_SECOND);
const stopRules = new Set(['SYG-01', 'ZNAK-STOP', 'ZNAK-S2']);

type Candidate = {
  verdict: Verdict;
  rank: number;
  start: number;
  end: number;
  still: number;
};

export type GloryClip = {
  verdict: Verdict;
  frames: readonly ReplayFrame[];
  stillIndex: number;
};

export class GloryReplay {
  private readonly pending: Candidate[] = [];
  private safeSince = -Infinity;
  private best?: Candidate;
  private clip?: GloryClip;

  constructor(
    private readonly replay: ReplayBuffer,
    private readonly stopSpeed: number,
  ) {}

  reset() {
    this.pending.length = 0;
    this.safeSince = -Infinity;
    this.best = this.clip = undefined;
  }

  interrupt(at: number) {
    this.pending.length = 0;
    this.safeSince = tickAt(at) + 1;
  }

  record(at: number, verdicts: readonly Verdict[], unsafe: boolean) {
    if (unsafe || verdicts.some(({ kind }) => kind !== 'good')) {
      const best = this.best;
      if (
        best &&
        verdicts.some(
          ({ kind, at }) =>
            kind !== 'good' &&
            tickAt(at) >= best.start &&
            tickAt(at) <= best.end,
        )
      )
        this.best = this.clip = undefined;
      this.interrupt(at);
      return;
    }
    const end = tickAt(at);
    this.settle(end - guard);
    if (!verdicts.length) return;
    const first = tickAt(this.replay.frame(0)!.at);
    const start = Math.max(end - lead, first);
    if (start < this.safeSince || end - start < minimum) return;

    for (const verdict of verdicts) {
      const rank = habits.indexOf(verdict.ruleId);
      if (rank < 0 || (this.best && rank >= this.best.rank)) continue;
      const last = this.pending.at(-1);
      if (last && rank >= last.rank) continue;
      let still = end;
      if (stopRules.has(verdict.ruleId)) {
        // A stop verdict may arrive when the rider starts moving again.
        while (
          still >= start &&
          this.replay.frame(still - first)!.rider.speed >= this.stopSpeed
        )
          still--;
        if (still < start) continue;
      }
      this.pending.push({ verdict, rank, start, end, still });
    }
  }

  finish() {
    this.settle(Infinity);
    return this.clip;
  }

  private settle(through: number) {
    let winner: Candidate | undefined;
    while (this.pending[0] && this.pending[0].end <= through)
      winner = this.pending.shift();
    if (!winner) return;

    const frames: ReplayFrame[] = [];
    const firstTick = tickAt(this.replay.frame(0)!.at);
    for (let tick = winner.start; tick <= winner.end; tick++)
      frames.push(this.replay.frame(tick - firstTick)!);
    // The rolling lesson buffer is reused every tick and cleared at checkpoints.
    this.clip = {
      verdict: winner.verdict,
      frames: structuredClone(frames),
      stillIndex: winner.still - winner.start,
    };
    this.best = winner;
  }
}
