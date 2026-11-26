import { campaignCity, type CampaignCity } from '../../content/missions';
import { moduleId, type GameContent } from '../../content/schemas';
import type { ProgressProfile } from '../../core/progressStore';
import { moduleMastery } from '../../progression/mastery';
import { reputationXp } from '../../progression/reputation';
import { placIds, scorePlac, type PlacResult } from '../plac/PlacRun';
import { drawQuestions } from '../quiz/leitner';

export type TheoryResult = { correct: number; total: number };
export type ExamAttempt = { city: CampaignCity; theory: TheoryResult };
export type ExamRide = ExamAttempt & { plac: readonly PlacResult[] };
export type RideResult = { completed: boolean; minor: number; major: number };
export type ExamResult = ExamRide & { ride?: RideResult };
type ExamBalance = GameContent['balans']['licencja'];

export function campaignCompleted(
  city: CampaignCity,
  profile: Pick<ProgressProfile, 'completed'>,
  content: Pick<GameContent, 'misje'>,
) {
  const missions = content.misje.filter(
    ({ miasto, poboczna }) => miasto === city && !poboczna,
  );
  return (
    missions.length > 0 &&
    missions.every(({ id }) => profile.completed.includes(id))
  );
}

export function licenceRequirements(
  profile: ProgressProfile,
  content: GameContent,
) {
  const cities = campaignCity.options.filter((city) =>
    campaignCompleted(city, profile, content),
  );
  const rank = content.balans.rangi.find(({ id }) => id === 'mistrz_szlaku');
  const rankMet = rank?.xp != null && reputationXp(profile) >= rank.xp;
  const missingModules = moduleId.options.filter((module) => {
    const ids = content.przepisy.przepisy
      .filter(({ modul }) => modul === module)
      .map(({ id }) => id);
    return (
      moduleMastery(profile.mastery, ids) <
      content.balans.licencja.mastery_min_modul
    );
  });
  return { cities, rankMet, missingModules };
}

export function drawExamQuestions(content: GameContent, seed: number) {
  const { pytania } = content.pytania;
  const limit = content.balans.licencja.teoria_pytan;
  const roadModules = moduleId.options.filter((module) => module !== 'M08');
  const twoPerRoadModule = limit >= 2 * roadModules.length;
  const minimum = twoPerRoadModule
    ? 2
    : Number(limit >= moduleId.options.length);
  const groups = moduleId.options.map((module, index) => {
    const questions = drawQuestions(
      pytania.filter(({ modul }) => modul === module),
      {},
      () => 0,
      content.balans.mastery,
      (seed + index) >>> 0,
    );
    const count = twoPerRoadModule && module === 'M08' ? 0 : minimum;
    return { questions, count, remainder: 0 };
  });

  // Allocate the remaining seats in proportion to each remaining pool.
  // Equal remainders keep the order of moduleId.options.
  const reserved = groups.reduce((sum, { count }) => sum + count, 0);
  const available = pytania.length - reserved;
  const extra = limit - reserved;
  let unassigned = extra;
  if (extra > 0) {
    for (const group of groups) {
      const share = (group.questions.length - group.count) * extra;
      const seats = Math.floor(share / available);
      group.count += seats;
      group.remainder = share % available;
      unassigned -= seats;
    }
    const byRemainder = [...groups].sort((a, b) => b.remainder - a.remainder);
    for (const group of byRemainder.slice(0, unassigned)) group.count++;
  }

  const questions = groups.flatMap(({ questions, count }) =>
    questions.slice(0, count),
  );
  return drawQuestions(
    questions,
    {},
    () => 0,
    content.balans.mastery,
    seed ^ 0x719fad,
  );
}

export function theoryPassed(
  { correct, total }: TheoryResult,
  balance: ExamBalance,
) {
  return (
    total === balance.teoria_pytan &&
    Number.isInteger(correct) &&
    correct >= 0 &&
    correct <= total &&
    correct / total >= balance.teoria_prog
  );
}

export function evaluateExam(
  result: ExamResult,
  balance: GameContent['balans'],
) {
  const practice = scorePlac(
    result.plac,
    balance.plac,
    balance.licencja.plac_prog,
  );
  const passedTheory = theoryPassed(result.theory, balance.licencja);
  const passedPractice =
    practice.passed &&
    result.plac.length === placIds.length &&
    placIds.every((id, index) => result.plac[index]?.id === id);
  const ride = result.ride;
  const passedRide =
    !!ride?.completed &&
    ride.minor <= balance.licencja.przejazd_max_minor &&
    ride.major <= balance.licencja.przejazd_max_major;
  return {
    practice,
    passedTheory,
    passedPractice,
    passedRide,
    passed: passedTheory && passedPractice && passedRide,
  };
}
