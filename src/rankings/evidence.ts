import type { RankingScore } from '../content/rankings';
import type { DriveInput } from '../gameplay/bicycle';
import type { Verdict } from '../rules/types';

type Evidence = Pick<RankingScore, 'seed' | 'inputHash' | 'version'>;
type WithoutEvidence<T> = T extends RankingScore
  ? Omit<T, keyof Evidence>
  : never;
export type RankingResult = WithoutEvidence<RankingScore>;

export const rankingSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]!;

export async function inputHash(log: Uint8Array<ArrayBuffer>) {
  const hash = await crypto.subtle.digest('SHA-256', log);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

const maxTicks = 60 * 60 * 60;
const bytesPerTick = 5;
const signals = ['left', 'right', 'stop'];

type RiderActions = {
  signal: string | null;
  looking: boolean;
  lights: boolean;
  bell: boolean;
};

export class RideEvidence {
  private readonly log = new Uint8Array(maxTicks * bytesPerTick);
  private ticks = 0;
  private longest = 0;
  private streak = 0;
  private meters = 0;
  private unsafe = false;
  private counts = { good: 0, minor: 0, major: 0 };

  constructor(
    readonly seed: number,
    readonly consent: number,
  ) {}

  step(
    input: DriveInput,
    actions: RiderActions,
    walking: boolean,
    helmetFastened = false,
    phoneInHand = false,
  ) {
    if (this.ticks >= maxTicks) {
      this.unsafe = true;
      return;
    }
    const offset = this.ticks++ * bytesPerTick;
    this.log[offset] = Math.round(input.x * 127) + 127;
    this.log[offset + 1] = Math.round(input.y * 127) + 127;
    this.log[offset + 2] = Math.round((input.brakePressure ?? 0) * 255);
    this.log[offset + 3] =
      (input.brake ? 1 : 0) |
      (input.scheme === 'classic' ? 2 : 0) |
      (walking ? 4 : 0) |
      (actions.looking ? 8 : 0) |
      (actions.lights ? 16 : 0) |
      (actions.bell ? 32 : 0) |
      (helmetFastened ? 64 : 0) |
      (phoneInHand ? 128 : 0);
    this.log[offset + 4] = actions.signal
      ? signals.indexOf(actions.signal) + 1
      : 0;
  }

  road(
    verdicts: readonly Pick<Verdict, 'kind'>[],
    meters: number,
    unsafe: boolean,
  ) {
    this.meters += meters;
    this.unsafe ||= unsafe;
    for (const { kind } of verdicts) {
      this.counts[kind]++;
      this.streak = kind === 'good' ? this.streak + 1 : 0;
      this.longest = Math.max(this.streak, this.longest);
    }
  }

  static verdictStats(verdicts: readonly Pick<Verdict, 'kind'>[]) {
    const stats = { good: 0, minor: 0, major: 0, longestSeries: 0 };
    let streak = 0;
    for (const { kind } of verdicts) {
      stats[kind]++;
      streak = kind === 'good' ? streak + 1 : 0;
      stats.longestSeries = Math.max(stats.longestSeries, streak);
    }
    return stats;
  }

  get roadStats() {
    return {
      ...this.counts,
      ticks: this.ticks,
      longestSeries: this.longest,
      cleanMeters:
        this.unsafe || this.counts.minor > 0 || this.counts.major > 0
          ? 0
          : Math.floor(this.meters),
      speedPercent: 100 as const,
    };
  }

  get valid() {
    return this.ticks > 0 && this.ticks < maxTicks;
  }

  digest() {
    return inputHash(this.log.subarray(0, this.ticks * bytesPerTick));
  }
}

export function qualifies(score: RankingResult) {
  switch (score.kind) {
    case 'mission':
      return score.major === 0;
    case 'ride':
      return score.cleanMeters > 0 || score.longestSeries > 0;
    case 'plac':
      return score.minor === 0 && score.major === 0;
    case 'weekly-xp':
      return score.xp >= 0.5;
  }
}
