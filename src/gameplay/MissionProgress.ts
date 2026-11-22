import type { DialogueLine, Dialogues } from '../content/dialogues';
import type { MissionDefinition } from '../content/missions';
import type { GameContent } from '../content/schemas';
import {
  tokensForImprovement,
  type Stars,
} from '../progression/missionRewards';

const progressKey = 'szprycha.mission-progress.v1';

export const canOpenPhone = (speed: number) => speed === 0;

function savedIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string')
    : [];
}

function savedCount(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

export class MissionProgress {
  private readonly completed = new Set<string>();
  private readonly introduced = new Set<string>();
  private readonly bestStars = new Map<string, Stars>();
  private tokenBalance = 0;
  private seriesRecord = 0;

  get tokens() {
    return this.tokenBalance;
  }

  get longestSeries() {
    return this.seriesRecord;
  }

  constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const raw: unknown = JSON.parse(storage?.getItem(progressKey) ?? 'null');
      if (raw && typeof raw === 'object') {
        if ('completed' in raw)
          for (const id of savedIds(raw.completed)) this.completed.add(id);
        if (
          'progression' in raw &&
          raw.progression &&
          typeof raw.progression === 'object'
        ) {
          const progress = raw.progression;
          if ('tokens' in progress)
            this.tokenBalance = savedCount(progress.tokens);
          if ('longestSeries' in progress)
            this.seriesRecord = savedCount(progress.longestSeries);
          if (
            'bestStars' in progress &&
            progress.bestStars &&
            typeof progress.bestStars === 'object'
          ) {
            for (const [id, stars] of Object.entries(progress.bestStars))
              if (stars === 1 || stars === 2 || stars === 3)
                this.bestStars.set(id, stars);
          }
        }
        if ('introduced' in raw)
          for (const id of savedIds(raw.introduced)) this.introduced.add(id);
      }
    } catch {
      // In-memory progression also works when local storage is unavailable.
    }
  }

  complete(
    mission: MissionDefinition,
    reward?: { stars: Stars; balance: GameContent['balans']['gwiazdki'] },
  ) {
    this.completed.add(mission.id);
    let tokens = 0;
    if (reward) {
      const previous = this.bestStars.get(mission.id) ?? 0;
      tokens = tokensForImprovement(reward.balance, previous, reward.stars);
      if (reward.stars > previous) this.bestStars.set(mission.id, reward.stars);
      this.tokenBalance += tokens;
    }
    this.save();
    return tokens;
  }

  recordSeries(length: number) {
    if (length <= this.seriesRecord) return;
    this.seriesRecord = length;
    this.save();
  }

  isAvailable(mission: MissionDefinition, content: GameContent) {
    const { ranga_min, misje_ukonczone } = mission.wymagania ?? {};
    if (misje_ukonczone?.some((id) => !this.completed.has(id))) return false;
    if (!ranga_min) return true;
    const rank = content.balans.rangi.find(({ id }) => id === ranga_min);
    if (rank?.xp == null) return false;
    const xp = content.misje.reduce(
      (sum, order) =>
        sum + (this.completed.has(order.id) ? order.nagrody.xp : 0),
      0,
    );
    return xp >= rank.xp;
  }

  opening(mission: MissionDefinition, content: Dialogues): DialogueLine[] {
    const lines: DialogueLine[] = [];
    for (const ruleId of mission.reguly_cwiczone) {
      if (this.introduced.has(ruleId)) continue;
      const tip = content.zapowiedzi.find(({ regula }) => regula === ruleId);
      if (!tip) continue;
      const { emocja, tekst, lektor } = tip;
      lines.push({ postac: 'sierzant_ola', emocja, tekst, lektor });
      this.introduced.add(ruleId);
    }
    if (lines.length) this.save();
    return [...lines, ...missionLines(content, mission.dialog_start)];
  }

  private save() {
    try {
      this.storage?.setItem(
        progressKey,
        JSON.stringify({
          completed: [...this.completed],
          introduced: [...this.introduced],
          progression: {
            bestStars: Object.fromEntries(this.bestStars),
            tokens: this.tokenBalance,
            longestSeries: this.seriesRecord,
          },
        }),
      );
    } catch {
      // Keep the current session playable if persistence fails.
    }
  }
}

export function missionLines(content: Dialogues, id?: string): DialogueLine[] {
  return content.dialogi.find((dialogue) => dialogue.id === id)?.linie ?? [];
}

function localStorageIfAvailable() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export const missionProgress = new MissionProgress(
  typeof window === 'undefined' ? undefined : localStorageIfAvailable(),
);
