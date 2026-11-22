import type { Condition, GameContent } from '../content/schemas';
import type { ProgressProfile } from '../core/progressStore';
import type { MissionDefinition } from '../content/missions';
import { moduleMastery, type ModuleId } from './mastery';
import { reputationXp } from './reputation';
import { seriesMultiplier } from './SafetySeries';

type Template = GameContent['wyzwania']['wyzwania'][number];
type Challenge = Template & { module: ModuleId };
type DailyBalance = GameContent['balans']['wyzwania_dzienne'];
type Trigger = 'ride' | 'photo' | 'mission' | 'quiz';
type Day = NonNullable<ProgressProfile['daily']>;
type Achievement = GameContent['osiagniecia']['osiagniecia'][number];

function seededOrder(id: string, seed: string) {
  let hash = 2166136261;
  for (const char of `${seed}:${id}`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
}

export function generateDailyChallenges(
  date: string,
  nicknameSeed: number,
  templates: readonly Challenge[],
  mastery: (module: ModuleId) => number,
  balance: DailyBalance,
) {
  const seed = `${date}:${nicknameSeed}`;
  const shuffled = [...templates].sort(
    (a, b) => seededOrder(a.id, seed) - seededOrder(b.id, seed),
  );
  const weakest = shuffled.reduce<ModuleId | undefined>(
    (module, candidate) =>
      !module || mastery(candidate.module) < mastery(module)
        ? candidate.module
        : module,
    undefined,
  );
  const priority = shuffled
    .filter(({ module }) => module === weakest)
    .slice(0, balance.z_najslabszego_modulu);
  return [
    ...priority,
    ...shuffled.filter((item) => !priority.includes(item)),
  ].slice(0, balance.liczba);
}

function respondsTo(condition: Condition, trigger: Trigger): boolean {
  if ('all' in condition)
    return condition.all.some((child) => respondsTo(child, trigger));
  if (trigger === 'ride')
    return (
      'good' in condition ||
      'good_modul' in condition ||
      'combo' in condition ||
      'seria' in condition
    );
  if (trigger === 'mission')
    return (
      'misje_typ' in condition ||
      'zleceniodawca' in condition ||
      'scenka_pp' in condition
    );
  if (trigger === 'quiz') return 'quiz_seria' in condition;
  return 'album' in condition;
}

export class Milestones {
  private readonly challenges: Challenge[];
  private readonly templatesById: Map<string, Challenge>;
  private readonly rulesByModule = new Map<ModuleId, string[]>();
  private readonly achievements: Record<
    Trigger,
    GameContent['osiagniecia']['osiagniecia']
  >;
  private readonly dailyRanks: GameContent['balans']['rangi'];
  readonly signs: ReadonlyMap<string, GameContent['znaki']['znaki'][number]>;

  constructor(private readonly content: GameContent) {
    const modulesByRule = new Map<string, ModuleId>();
    for (const { id, modul } of content.przepisy.przepisy) {
      modulesByRule.set(id, modul);
      let rules = this.rulesByModule.get(modul);
      if (!rules) this.rulesByModule.set(modul, (rules = []));
      rules.push(id);
    }
    this.challenges = content.wyzwania.wyzwania.map((template) => ({
      ...template,
      module: modulesByRule.get(template.good)!,
    }));
    this.templatesById = new Map(
      this.challenges.map((item) => [item.id, item]),
    );
    const active = content.osiagniecia.osiagniecia.filter(
      ({ aktywne }) => aktywne,
    );
    this.achievements = {
      ride: active.filter(({ warunek }) => respondsTo(warunek, 'ride')),
      photo: active.filter(({ warunek }) => respondsTo(warunek, 'photo')),
      mission: active.filter(({ warunek }) => respondsTo(warunek, 'mission')),
      quiz: active.filter(({ warunek }) => respondsTo(warunek, 'quiz')),
    };
    this.dailyRanks = content.balans.rangi.filter(({ odblokuj }) =>
      odblokuj.includes('wyzwania_dzienne'),
    );
    this.signs = new Map(content.znaki.znaki.map((sign) => [sign.kod, sign]));
  }

  canPlayDaily(profile: ProgressProfile) {
    const xp = reputationXp(profile);
    for (const rank of this.dailyRanks)
      if (rank.xp === null ? profile.licencePassed : xp >= rank.xp) return true;
    return false;
  }

  daily(profile: ProgressProfile, date: string): Day | undefined {
    if (profile.daily && profile.daily.date >= date)
      return profile.daily.date === date ? profile.daily : undefined;
    if (!this.canPlayDaily(profile)) return;
    const templates = generateDailyChallenges(
      date,
      profile.nicknameSeed,
      this.challenges,
      (module) =>
        moduleMastery(profile.mastery, this.rulesByModule.get(module) ?? []),
      this.content.balans.wyzwania_dzienne,
    );
    return (profile.daily = {
      date,
      entries: templates.map(({ id }) => ({ id, count: 0, completed: false })),
    });
  }

  dailyCards(day: Day | undefined) {
    return (day?.entries ?? []).flatMap((entry) => {
      const template = this.templatesById.get(entry.id);
      return template ? [{ ...template, ...entry }] : [];
    });
  }

  good(profile: ProgressProfile, rule: string, series: number, date: string) {
    const day = this.daily(profile, date);
    profile.goodHabits[rule] = (profile.goodHabits[rule] ?? 0) + 1;
    if (series > profile.achievementSeries) profile.achievementSeries = series;
    this.awardAchievements(profile, 'ride');
    if (!day) return;
    for (const entry of day.entries) {
      if (entry.completed) continue;
      const template = this.templatesById.get(entry.id);
      if (template?.good !== rule || ++entry.count < template.ile) continue;
      entry.completed = true;
      profile.progression.tokens += this.content.balans.wyzwania_dzienne.zetony;
      if (!profile.stickers.includes(template.naklejka))
        profile.stickers.push(template.naklejka);
    }
  }

  completeCleanMission(profile: ProgressProfile, mission: MissionDefinition) {
    profile.cleanMissions[mission.id] =
      (profile.cleanMissions[mission.id] ?? 0) + 1;
    this.awardAchievements(profile, 'mission');
  }

  photograph(profile: ProgressProfile, code: string, image: string) {
    if (!this.signs.has(code) || Object.hasOwn(profile.signPhotos, code))
      return false;
    profile.signPhotos[code] = image;
    this.awardAchievements(profile, 'photo');
    return true;
  }

  quiz(profile: ProgressProfile) {
    const earned: Achievement[] = [];
    this.awardAchievements(profile, 'quiz', earned);
    return earned;
  }

  private awardAchievements(
    profile: ProgressProfile,
    trigger: Trigger,
    earned?: Achievement[],
  ) {
    for (const achievement of this.achievements[trigger]) {
      const { id, zetony, warunek } = achievement;
      if (
        Object.hasOwn(profile.achievementXp, id) ||
        !this.met(profile, warunek)
      )
        continue;
      profile.achievementXp[id] =
        zetony * this.content.balans.osiagniecia.xp_za_zeton;
      profile.progression.tokens += zetony;
      earned?.push(achievement);
    }
  }

  private met(profile: ProgressProfile, condition: Condition): boolean {
    if ('all' in condition)
      return condition.all.every((child) => this.met(profile, child));
    if ('good' in condition)
      return (profile.goodHabits[condition.good] ?? 0) >= condition.ile;
    if ('good_modul' in condition) {
      let total = 0;
      for (const rule of this.rulesByModule.get(condition.good_modul) ?? [])
        total += profile.goodHabits[rule] ?? 0;
      return total >= condition.ile;
    }
    if ('album' in condition) {
      let count = 0;
      for (const code of this.signs.keys())
        if (Object.hasOwn(profile.signPhotos, code)) count++;
      return count * 100 >= this.signs.size * condition.album;
    }
    if ('combo' in condition)
      return (
        seriesMultiplier(
          this.content.balans.combo,
          profile.achievementSeries,
        ) >= condition.combo
      );
    if ('seria' in condition)
      return profile.achievementSeries >= condition.seria;
    if ('quiz_seria' in condition)
      return profile.quiz.streak >= condition.quiz_seria;
    if ('scenka_pp' in condition)
      return this.content.misje.some(
        ({ id, typ }) =>
          typ === 'pierwsza_pomoc' && (profile.cleanMissions[id] ?? 0) > 0,
      );
    if ('misje_typ' in condition || 'zleceniodawca' in condition) {
      let total = 0;
      for (const mission of this.content.misje) {
        if (
          'misje_typ' in condition
            ? mission.typ === condition.misje_typ
            : mission.zleceniodawca === condition.zleceniodawca
        )
          total += profile.cleanMissions[mission.id] ?? 0;
      }
      return total >= condition.ile;
    }
    return false;
  }
}
