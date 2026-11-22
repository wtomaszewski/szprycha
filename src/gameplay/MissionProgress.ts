import type { DialogueLine, Dialogues } from '../content/dialogues';
import type { MissionCity, MissionDefinition } from '../content/missions';
import { moduleId, type GameContent } from '../content/schemas';
import { BreakReminder } from '../progression/breakReminder';
import { Milestones } from '../progression/milestones';
import { ProgressStore, type RideVerdict } from '../core/progressStore';
import {
  advanceQuizDay,
  drawQuizQuestions,
  isQuizCardDue,
  reviewQuizCard,
  type QuizQuestion,
} from './quiz';
import {
  applyMastery,
  localDay,
  masteryWeight,
  moduleMastery,
  type ModuleId,
} from '../progression/mastery';
import {
  tokensForImprovement,
  type Stars,
} from '../progression/missionRewards';
import {
  rankUnlocks,
  reputationRank,
  reputationXp,
} from '../progression/reputation';

type MissionReward = {
  points: number;
  stars: Stars;
  clean?: boolean;
  balance: GameContent['balans']['gwiazdki'];
};

export const canOpenPhone = (speed: number) => speed === 0;

export class MissionProgress {
  private catalog?: Milestones;
  private readonly breakReminder = new BreakReminder();

  constructor(readonly store = new ProgressStore()) {}

  milestones(content: GameContent) {
    return (this.catalog ??= new Milestones(content));
  }

  dailyChallenges(content: GameContent, date = localDay(new Date())) {
    const milestones = this.milestones(content);
    const profile = this.store.profile;
    if (
      (!profile.daily || profile.daily.date < date) &&
      milestones.canPlayDaily(profile)
    )
      this.store.change((p) => milestones.daily(p, date));
    return milestones.dailyCards(
      profile.daily?.date === date ? profile.daily : undefined,
    );
  }

  photograph(content: GameContent, code: string, image: string) {
    const milestones = this.milestones(content);
    if (
      !milestones.signs.has(code) ||
      Object.hasOwn(this.store.profile.signPhotos, code)
    )
      return false;
    return this.store.change((profile) =>
      milestones.photograph(profile, code, image),
    );
  }

  breakMinutes(balance: GameContent['balans']['zdrowe_granie']) {
    const minutes = this.store.profile.breakMinutes;
    return minutes !== undefined && balance.opcje_min.includes(minutes)
      ? minutes
      : balance.przypomnienie_po_min;
  }

  setBreakMinutes(
    minutes: number,
    balance: GameContent['balans']['zdrowe_granie'],
  ) {
    if (balance.opcje_min.includes(minutes))
      this.store.change((profile) => {
        profile.breakMinutes = minutes;
      });
  }

  playFor(seconds: number, minutes: number) {
    return this.breakReminder.advance(seconds, minutes);
  }

  get tokens() {
    return this.store.profile.progression.tokens;
  }

  get longestSeries() {
    return this.store.profile.progression.longestSeries;
  }

  get xp() {
    return reputationXp(this.store.profile);
  }

  rank(content: GameContent) {
    return reputationRank(
      content.balans.rangi,
      this.xp,
      this.store.profile.licencePassed,
    );
  }

  unlocks(content: GameContent) {
    const { balans } = content;
    const masteryMet = moduleId.options.every(
      (module) =>
        this.moduleMastery(module, content) >=
        balans.licencja.mastery_min_modul,
    );
    return rankUnlocks(
      balans.rangi,
      this.xp,
      this.store.profile.licencePassed,
      masteryMet,
    );
  }

  complete(mission: MissionDefinition, reward?: MissionReward) {
    return this.store.change((profile) => {
      if (!profile.completed.includes(mission.id))
        profile.completed.push(mission.id);
      if (!reward) return 0;
      profile.missionPoints += Math.max(0, reward.points);
      const best = profile.bestScores[mission.id];
      if (best === undefined || reward.points > best)
        profile.bestScores[mission.id] = reward.points;

      const progression = profile.progression;
      const previous = progression.bestStars[mission.id] ?? 0;
      const tokens = tokensForImprovement(
        reward.balance,
        previous,
        reward.stars,
      );
      if (reward.stars !== 0 && reward.stars > previous)
        progression.bestStars[mission.id] = reward.stars;
      progression.tokens += tokens;
      if (reward.clean) this.catalog?.completeCleanMission(profile, mission);
      return tokens;
    });
  }

  bestScore(missionId: string) {
    return this.store.profile.bestScores[missionId];
  }

  ruleMastery(ruleId: string) {
    return this.store.profile.mastery[ruleId]?.value ?? 0;
  }

  moduleMastery(module: ModuleId, content: GameContent) {
    const ids = content.przepisy.przepisy
      .filter(({ modul }) => modul === module)
      .map(({ id }) => id);
    return moduleMastery(this.store.profile.mastery, ids);
  }

  eventWeight(ruleId: string, balance: GameContent['balans']['mastery']) {
    return masteryWeight(this.ruleMastery(ruleId), balance);
  }

  recordRide(
    verdicts: readonly RideVerdict[],
    longest: number,
    balance: GameContent['balans']['mastery'],
    day?: string,
  ) {
    this.store.recordRide(verdicts, longest, balance, day, this.catalog);
  }

  recordControlAnswer(
    ruleId: string,
    correct: boolean,
    balance: GameContent['balans']['mastery'],
  ) {
    if (correct) this.recordQuizAnswer(ruleId, true, balance);
  }

  recordQuizAnswer(
    ruleId: string,
    correct: boolean,
    balance: GameContent['balans']['mastery'],
    xpAwarded = 0,
  ) {
    const day = localDay(new Date());
    this.store.change((profile) => {
      applyMastery(
        profile.mastery,
        ruleId,
        correct ? 'quiz_ok' : 'quiz_zle',
        balance,
        day,
      );
      if (correct) profile.quizXp += xpAwarded;
    });
  }

  visitQuizDay(date = localDay(new Date())) {
    const { quiz } = this.store.profile;
    if (!quiz.lastDay || date > quiz.lastDay)
      this.store.change((profile) => advanceQuizDay(profile.quiz, date));
  }

  quizQuestions(content: GameContent, seed: number, module?: ModuleId) {
    this.visitQuizDay();
    return drawQuizQuestions(
      content,
      this.store.profile.quiz,
      (id) => this.ruleMastery(id),
      seed,
      module,
    );
  }

  recordStudyAnswer(
    content: GameContent,
    question: QuizQuestion,
    correct: boolean,
    date = localDay(new Date()),
  ) {
    const { balans } = content;
    const milestones = this.milestones(content);
    this.store.change((profile) => {
      const { quiz } = profile;
      advanceQuizDay(quiz, date);
      // Another tab may have already moved this card out of today's review.
      if (!isQuizCardDue(quiz, question.id)) return;
      quiz.cards[question.id] = reviewQuizCard(
        quiz.cards[question.id],
        correct,
        quiz.day,
        balans.leitner_odstepy_dni,
      );
      for (const rule of question.przepisy)
        applyMastery(
          profile.mastery,
          rule,
          correct ? 'quiz_ok' : 'quiz_zle',
          balans.mastery,
          date,
        );
      if (correct) profile.quizXp += balans.quiz.xp_za_odpowiedz;
      milestones.studyAnswer(profile, correct);
    });
    return this.store.flush();
  }

  awardAchievement(id: string, xp: number) {
    this.store.change((profile) => {
      if (!Object.hasOwn(profile.achievementXp, id))
        profile.achievementXp[id] = xp;
    });
  }

  recordLicencePassed() {
    this.store.change((profile) => {
      profile.licencePassed = true;
    });
  }

  get selectedCity(): MissionCity {
    return this.store.profile.selectedCity ?? 'warszawa';
  }

  async selectCity(city: MissionCity) {
    this.store.change((profile) => {
      profile.selectedCity = city;
    });
    await this.store.flush();
  }

  nextMission(city: MissionCity, content: GameContent) {
    return content.misje.find(
      (mission) =>
        mission.miasto === city &&
        !mission.poboczna &&
        !this.store.profile.completed.includes(mission.id) &&
        this.isAvailable(mission, content),
    );
  }

  isAvailable(mission: MissionDefinition, content: GameContent) {
    const { ranga_min, misje_ukonczone } = mission.wymagania ?? {};
    if (
      misje_ukonczone?.some((id) => !this.store.profile.completed.includes(id))
    )
      return false;
    if (!ranga_min) return true;
    const rank = content.balans.rangi.find(({ id }) => id === ranga_min);
    if (!rank) return false;
    return rank.xp === null
      ? this.store.profile.licencePassed
      : this.xp >= rank.xp;
  }

  opening(mission: MissionDefinition, content: Dialogues): DialogueLine[] {
    const lines: DialogueLine[] = [];
    const newRules: string[] = [];
    for (const ruleId of mission.reguly_cwiczone) {
      if (
        this.store.profile.introduced.includes(ruleId) ||
        newRules.includes(ruleId)
      )
        continue;
      const tip = content.zapowiedzi.find(({ regula }) => regula === ruleId);
      if (!tip) continue;
      const { emocja, tekst, lektor } = tip;
      lines.push({ postac: 'sierzant_ola', emocja, tekst, lektor });
      newRules.push(ruleId);
    }
    if (newRules.length)
      this.store.change((profile) => {
        for (const id of newRules)
          if (!profile.introduced.includes(id)) profile.introduced.push(id);
      });
    return [...lines, ...missionLines(content, mission.dialog_start)];
  }
}

export function missionLines(content: Dialogues, id?: string): DialogueLine[] {
  return content.dialogi.find((dialogue) => dialogue.id === id)?.linie ?? [];
}

export async function loadMissionProgress() {
  let indexedDb: IDBFactory | undefined;
  let legacyStorage: Storage | undefined;
  try {
    indexedDb = window.indexedDB;
  } catch {
    // Some browser settings disallow access to the property itself.
  }
  try {
    legacyStorage = window.localStorage;
  } catch {
    // The IndexedDB profile can still load without localStorage.
  }
  const progress = new MissionProgress(
    await ProgressStore.open(indexedDb, legacyStorage),
  );
  // Count distinct days when the game is played, including days spent driving.
  if (progress.store.profile.quiz.lastDay) progress.visitQuizDay();
  return progress;
}
