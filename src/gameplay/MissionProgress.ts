import type { DialogueLine, Dialogues } from '../content/dialogues';
import type { MissionDefinition } from '../content/missions';
import { moduleId, type GameContent } from '../content/schemas';
import { ProgressStore } from '../core/progressStore';
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
import type { Verdict } from '../rules/types';

type RideVerdict = Pick<Verdict, 'kind' | 'ruleId'>;
type MissionReward = {
  points: number;
  stars: Stars;
  balance: GameContent['balans']['gwiazdki'];
};

export const canOpenPhone = (speed: number) => speed === 0;

export class MissionProgress {
  constructor(readonly store = new ProgressStore()) {}

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
    day = localDay(new Date()),
  ) {
    if (!verdicts.length) return;
    // The scene reuses its tick buffer. Persistence can run after the next tick.
    const batch = verdicts.slice();
    this.store.change((profile) => {
      for (const { kind, ruleId } of batch)
        applyMastery(profile.mastery, ruleId, kind, balance, day);
      profile.progression.longestSeries = Math.max(
        profile.progression.longestSeries,
        longest,
      );
    });
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
  return new MissionProgress(
    await ProgressStore.open(indexedDb, legacyStorage),
  );
}
