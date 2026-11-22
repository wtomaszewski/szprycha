import type { RankingScore } from '../../src/content/rankings.ts';
import type { MissionCity } from '../../src/content/missions.ts';

interface Timing {
  version: string;
  minTicks: number;
  maxTicks: number;
}

export interface RankingRules {
  missions: Record<
    string,
    Timing & {
      city: MissionCity;
      smoothBonus: number;
      parSeconds: number;
      limitSeconds?: number;
    }
  >;
  plac: Timing;
  ride: Record<MissionCity, { version: string; maxTicks: number }>;
  weeklyXp: { version: string };
  scoring: {
    ticksPerSecond: number;
    maxMetersPerTick: number;
    maxVerdictsPerSecond: number;
    verdictBurst: number;
    completion: number;
    pointsPerGood: number;
    maxMultiplier: number;
    minorPenalty: number;
    timeBonus: number;
    questionBonus: number;
  };
}

export function validateScore(score: RankingScore, rules: RankingRules) {
  if (score.kind === 'weekly-xp')
    return score.version === rules.weeklyXp.version;
  if (score.kind === 'plac') {
    const { version, minTicks, maxTicks } = rules.plac;
    return (
      score.version === version &&
      score.minor === 0 &&
      score.major === 0 &&
      score.ticks >= minTicks &&
      score.ticks <= maxTicks
    );
  }
  const ride = rules.ride[score.city];
  const { scoring } = rules;
  if (
    score.good + score.minor + score.major >
      scoring.verdictBurst +
        Math.floor(
          (scoring.maxVerdictsPerSecond * score.ticks) / scoring.ticksPerSecond,
        ) ||
    score.longestSeries > score.good ||
    (score.good > 0 &&
      score.longestSeries <
        Math.ceil(score.good / (1 + score.minor + score.major))) ||
    score.cleanMeters > Math.floor(score.ticks * scoring.maxMetersPerTick) ||
    (score.cleanMeters > 0 && (score.minor > 0 || score.major > 0))
  )
    return false;

  if (score.kind === 'ride') {
    return (
      score.version === ride.version &&
      score.ticks <= ride.maxTicks &&
      (score.cleanMeters > 0 || score.longestSeries > 0)
    );
  }

  const mission = Object.hasOwn(rules.missions, score.missionId)
    ? rules.missions[score.missionId]
    : undefined;
  if (
    !mission ||
    mission.city !== score.city ||
    score.version !== mission.version ||
    score.major !== 0 ||
    score.ticks < mission.minTicks ||
    score.ticks > mission.maxTicks
  )
    return false;

  const elapsed = score.ticks / scoring.ticksPerSecond;
  const timeFactor =
    elapsed <= mission.parSeconds
      ? 1
      : mission.limitSeconds !== undefined && elapsed < mission.limitSeconds
        ? (mission.limitSeconds - elapsed) /
          (mission.limitSeconds - mission.parSeconds)
        : 0;
  const base = scoring.completion - score.minor * scoring.minorPenalty;
  const maxPoints =
    base +
    score.good * scoring.pointsPerGood * scoring.maxMultiplier +
    Math.round(timeFactor * scoring.timeBonus) +
    mission.smoothBonus +
    score.minor * scoring.questionBonus;
  return (
    score.points >= base + score.good * scoring.pointsPerGood &&
    score.points <= maxPoints
  );
}
