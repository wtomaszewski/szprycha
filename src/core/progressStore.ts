import { tutorialStates } from '../gameplay/Tutorial';
import { get, update, type UseStore } from 'idb-keyval';
import { z } from 'zod';
import { audioSettingsSchema, defaultAudio } from '../audio/settings';
import {
  generateNickname,
  isGeneratedNickname,
  maxNicknameLength,
  migrateNickname,
} from '../content/nicknames';
import { campaignCity, missionCity } from '../content/missions';
import type { GameContent } from '../content/schemas';
import { placRecordsSchema } from '../gameplay/plac/placRecords';
import { storyTemplates } from '../gameplay/procedural/storyTemplates';
import { leitnerBoxes } from '../gameplay/quiz/leitner';
import { applyMastery, localDay } from '../progression/mastery';
import type { Milestones } from '../progression/milestones';
import { reputationXp } from '../progression/reputation';
import { addWeeklyXp, rankingState } from '../rankings/state';
import { touchLayoutSchema } from './touchLayout';
import { helmetColors, type HelmetColor } from '../render/spriteFrames';
import { ageBands, TICKS_PER_SECOND, type Verdict } from '../rules/types';
import type { UpdateProgress } from '../platform/preferencesProgress';

export const progressDatabase = 'szprycha';
export const progressStoreName = 'progress';
export const progressRecordKey = 'profile';
export const legacyProgressKey = 'szprycha.mission-progress.v1';

const id = z.string().regex(/^[A-Za-z0-9_-]+$/);
const count = z.number().int().nonnegative();
const score = z.number().int();
const stars = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const missionProgressFields = {
  completed: z.array(id),
  introduced: z.array(id),
  progression: z.strictObject({
    bestStars: z.record(id, stars),
    tokens: count,
    longestSeries: count,
  }),
};

const legacySchema = z.strictObject({
  ...missionProgressFields,
  version: z.literal(1).optional(),
  introduced: missionProgressFields.introduced.optional(),
  progression: missionProgressFields.progression.partial().optional(),
});

const m5bProfileSchema = z.strictObject({
  ...missionProgressFields,
  version: z.literal(2),
  nicknameSeed: count.max(299),
  missionPoints: count,
  bestScores: z.record(id, score),
  quizXp: count,
  achievementXp: z.record(id, count),
  licencePassed: z.boolean(),
  mastery: z.record(
    id,
    z.strictObject({
      value: z.number().min(0).max(100),
      goodDay: z.iso.date().optional(),
      goodToday: z.number().nonnegative(),
    }),
  ),
});

const m5cProfileSchema = m5bProfileSchema.extend({
  version: z.literal(3),
  goodHabits: z.record(id, count),
  achievementSeries: count,
  cleanMissions: z.record(id, count),
  signPhotos: z.record(
    z.string().regex(/^[A-Z]-[0-9]+[a-z]?(?:\/[A-Z]-[0-9]+[a-z]?)?$/),
    z
      .string()
      .max(64_000)
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/),
  ),
  daily: z
    .strictObject({
      date: z.iso.date(),
      entries: z
        .array(z.strictObject({ id, count, completed: z.boolean() }))
        .refine(
          (entries) =>
            new Set(entries.map((entry) => entry.id)).size === entries.length,
        ),
    })
    .optional(),
  stickers: z.array(id),
  gnomes: z.array(id).optional(),
  selectedCity: missionCity.optional(),
  plac: placRecordsSchema.optional(),
  breakMinutes: count.positive().optional(),
});

const m7bProfileSchema = m5cProfileSchema.extend({
  version: z.literal(4),
  quiz: z.strictObject({
    cards: z.record(
      z.string().regex(/^Q\d+$/),
      z.strictObject({
        box: count.min(1).max(leitnerBoxes),
        due: z.iso.date(),
      }),
    ),
    streak: count,
  }),
});

const m7cProfileSchema = m7bProfileSchema.extend({
  version: z.literal(5),
  licence: z
    .strictObject({
      date: z.iso.date(),
      theory: z
        .strictObject({ correct: count, total: count.positive() })
        .refine(({ correct, total }) => correct <= total),
      practice: z
        .strictObject({
          points: z.number().nonnegative(),
          max: z.number().positive(),
        })
        .refine(({ points, max }) => points <= max),
    })
    .optional(),
});

const m8aProfileSchema = m7cProfileSchema.extend({
  version: z.literal(6),
  audio: audioSettingsSchema.catch(() => ({ ...defaultAudio })),
});

const m8cProfileSchema = m8aProfileSchema.extend({
  version: z.literal(7),
  reducedEffects: z.boolean().catch(false).default(false),
  reflectiveVest: z.boolean().catch(false).default(false),
  resultsTextSize: z
    .enum(['medium', 'large', 'largest'])
    .optional()
    .catch(undefined),
  resultsHighContrast: z.boolean().optional().catch(undefined),
});

const m9ProfileSchema = m8cProfileSchema.extend({
  version: z.literal(8),
  touchLayout: touchLayoutSchema,
  haptics: z.boolean().optional().catch(undefined),
});

const identityProfileSchema = m9ProfileSchema.extend({
  version: z.literal(9),
  profileId: z.uuidv4(),
  nickname: z.string().max(maxNicknameLength).refine(isGeneratedNickname),
  avatarId: z.enum(helmetColors),
  ageBand: z.enum(ageBands).optional(),
  breakMinutes: count.positive().nullable().optional(),
  gentleFailure: z.boolean().optional().catch(undefined),
  signalCountdowns: z.boolean().optional().catch(undefined),
  examSignalCountdowns: z.boolean().optional().catch(undefined),
  onlineRankings: z.boolean(),
  rankings: rankingState.optional().catch(undefined),
  tutorial: z.enum(tutorialStates).optional().catch(undefined),
});

const storyProfileSchema = identityProfileSchema.extend({
  version: z.literal(10),
  freeRideCity: z.literal('krakow').optional(),
  stories: z.partialRecord(
    missionCity,
    z
      .strictObject({
        seed: count.max(0xffffffff),
        finished: count.max(storyTemplates.length),
        step: count,
      })
      .refine(
        ({ finished, step }) =>
          step < (storyTemplates[finished]?.kinds.length ?? 1),
      ),
  ),
});

export const graphicsQualities = ['auto', 'full', 'lite'] as const;

const krakowProfileSchema = storyProfileSchema.extend({
  version: z.literal(11),
  selectedCity: campaignCity.exclude(['gdansk']).optional(),
  freeRideCity: z.enum(['krakow', 'gdansk', 'wies']).optional(),
  obwarzanki: z.array(id).optional(),
  graphicsQuality: z.enum(graphicsQualities).optional().catch(undefined),
});

const profileVersion = 12;
const profileSchema = krakowProfileSchema.extend({
  version: z.literal(profileVersion),
  selectedCity: campaignCity.optional(),
  bursztyny: z.array(id).optional(),
});

function addStories(
  profile: z.infer<typeof identityProfileSchema>,
): ProgressProfile {
  return { ...profile, version: profileVersion, stories: {} };
}

export type ProgressProfile = z.infer<typeof profileSchema>;

export function showSignalCountdowns(profile: ProgressProfile, exam: boolean) {
  return exam
    ? (profile.examSignalCountdowns ?? false)
    : (profile.signalCountdowns ?? true);
}

export type RideVerdict = Pick<Verdict, 'kind' | 'ruleId'>;
type LegacyStorage = Pick<Storage, 'getItem' | 'removeItem'>;
type MasteryBalance = GameContent['balans']['mastery'];

function trackRankingXp<T>(
  profile: ProgressProfile,
  version: string | undefined,
  at: number,
  edit: () => T,
) {
  const state = profile.onlineRankings && profile.rankings;
  if (!version || !state || state.deleting) return edit();
  const before = reputationXp(profile);
  const result = edit();
  addWeeklyXp(state, version, reputationXp(profile) - before, at);
  return result;
}

const rideSaveTicks = 5 * TICKS_PER_SECOND;

class RideBatch {
  // Copy only the replay inputs, without retaining the scene's reusable verdicts.
  readonly ruleIds: string[] = [];
  readonly kinds: RideVerdict['kind'][] = [];
  readonly balances: MasteryBalance[] = [];
  readonly days: string[] = [];
  readonly cleanSeries: number[] = [];
  readonly times: number[] = [];
  milestones?: Milestones;
  longest = 0;
  ticks = 0;

  apply(profile: ProgressProfile, weeklyVersion?: string) {
    for (let i = 0; i < this.ruleIds.length; i++) {
      const rule = this.ruleIds[i]!;
      const day = this.days[i]!;
      const series = this.cleanSeries[i]!;
      if (series >= 0)
        trackRankingXp(profile, weeklyVersion, this.times[i]!, () =>
          this.milestones?.good(profile, rule, series, day),
        );
      applyMastery(
        profile.mastery,
        rule,
        this.kinds[i]!,
        this.balances[i]!,
        day,
      );
    }
    profile.progression.longestSeries = Math.max(
      profile.progression.longestSeries,
      this.longest,
    );
  }
}

function addRidePreferences(
  profile: z.infer<typeof m8aProfileSchema>,
): z.infer<typeof m9ProfileSchema> {
  return {
    ...profile,
    version: 8,
    reducedEffects: false,
    reflectiveVest: false,
  };
}

function addAudio(profile: z.infer<typeof m7cProfileSchema>) {
  return addRidePreferences({
    ...profile,
    version: 6,
    audio: { ...defaultAudio },
  });
}

function addQuiz(profile: z.infer<typeof m5cProfileSchema>) {
  return addAudio({ ...profile, version: 5, quiz: { cards: {}, streak: 0 } });
}

function upgrade(profile: z.infer<typeof m5bProfileSchema>) {
  return addQuiz({
    ...profile,
    version: 3,
    goodHabits: {},
    achievementSeries: 0,
    cleanMissions: {},
    signPhotos: {},
    stickers: [],
  });
}

export function newProfileId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // WebViews can expose random bytes even when the document is not a secure context.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

function addLocalIdentity(
  profile: z.infer<typeof m9ProfileSchema>,
  avatarId: HelmetColor = helmetColors[0],
  nickname = migrateNickname(profile.nicknameSeed),
): ProgressProfile {
  return addStories({
    ...profile,
    version: 9,
    profileId: newProfileId(),
    nickname,
    avatarId,
    onlineRankings: false,
  });
}

function createProfile(
  legacy?: z.infer<typeof legacySchema>,
  avatarId?: HelmetColor,
): ProgressProfile {
  const profile = upgrade({
    version: 2,
    nicknameSeed: Math.floor(Math.random() * 300),
    completed: [...new Set(legacy?.completed)],
    introduced: [...new Set(legacy?.introduced)],
    progression: {
      bestStars: legacy?.progression?.bestStars ?? {},
      tokens: legacy?.progression?.tokens ?? 0,
      longestSeries: legacy?.progression?.longestSeries ?? 0,
    },
    missionPoints: 0,
    bestScores: {},
    quizXp: 0,
    achievementXp: {},
    licencePassed: false,
    mastery: {},
  });
  const identified = addLocalIdentity(
    profile,
    avatarId,
    legacy === undefined ? generateNickname() : undefined,
  );
  if (legacy === undefined) identified.tutorial = 'move';
  return identified;
}

function decodeProfile(
  raw: unknown,
  avatarId?: HelmetColor,
): {
  profile: ProgressProfile;
  reset: boolean;
} {
  const current = profileSchema.safeParse(raw);
  if (current.success) return { profile: current.data, reset: false };
  const krakow = krakowProfileSchema.safeParse(raw);
  if (krakow.success)
    return {
      profile: { ...krakow.data, version: profileVersion },
      reset: false,
    };
  const stories = storyProfileSchema.safeParse(raw);
  if (stories.success)
    return {
      profile: { ...stories.data, version: profileVersion },
      reset: false,
    };
  const identity = identityProfileSchema.safeParse(raw);
  if (identity.success)
    return { profile: addStories(identity.data), reset: false };
  const migrated = (profile: z.infer<typeof m9ProfileSchema>) => ({
    profile: addLocalIdentity(profile, avatarId),
    reset: false,
  });
  const m9 = m9ProfileSchema.safeParse(raw);
  if (m9.success) return migrated(m9.data);
  const m8c = m8cProfileSchema.safeParse(raw);
  if (m8c.success) return migrated({ ...m8c.data, version: 8 });
  const m8a = m8aProfileSchema.safeParse(raw);
  if (m8a.success) return migrated(addRidePreferences(m8a.data));
  const m7c = m7cProfileSchema.safeParse(raw);
  if (m7c.success) return migrated(addAudio(m7c.data));
  const m7b = m7bProfileSchema.safeParse(raw);
  if (m7b.success) return migrated(addAudio({ ...m7b.data, version: 5 }));
  const m5c = m5cProfileSchema.safeParse(raw);
  if (m5c.success) return migrated(addQuiz(m5c.data));
  const m5b = m5bProfileSchema.safeParse(raw);
  if (m5b.success) return migrated(upgrade(m5b.data));
  const legacy = legacySchema.safeParse(raw);
  return {
    profile: createProfile(legacy.data, avatarId),
    reset: raw !== undefined && !legacy.success,
  };
}

function hasFutureVersion(raw: unknown) {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'version' in raw &&
    typeof raw.version === 'number' &&
    raw.version > profileVersion
  );
}

function openDatabase(factory: IDBFactory) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(progressDatabase, 1);
    let blocked = false;
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Progress database is blocked'));
    };
    request.onupgradeneeded = () =>
      request.result.createObjectStore(progressStoreName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      if (blocked) database.close();
      else resolve(database);
    };
  });
}

function indexedStore(db: IDBDatabase): UseStore {
  return async (mode, callback) =>
    callback(
      db.transaction(progressStoreName, mode).objectStore(progressStoreName),
    );
}

function retireLegacy(storage: LegacyStorage | undefined, hasLegacy: boolean) {
  if (!hasLegacy) return;
  try {
    storage?.removeItem(legacyProgressKey);
  } catch {
    // The committed profile takes precedence on subsequent loads.
  }
}

export class ProgressStore {
  private queue = Promise.resolve();
  private ride = new RideBatch();
  private cleanStreak = 0;
  private readonly unusedMastery = new Map<
    string,
    ProgressProfile['mastery'][string]
  >();
  private readonly date = new Date();
  private day = '';
  private dayKey = NaN;
  reset = false;
  sessionOnly: boolean;
  rankingXpVersion?: string;

  constructor(
    readonly profile = createProfile(),
    private readonly updateProgress?: UpdateProgress,
  ) {
    this.sessionOnly = !updateProgress;
  }

  static async open(
    factory: IDBFactory | undefined,
    legacyStorage?: LegacyStorage,
    native?: UpdateProgress,
  ): Promise<ProgressStore> {
    let legacy: unknown;
    let hasLegacy = false;
    try {
      const raw = legacyStorage?.getItem(legacyProgressKey);
      if (raw != null) {
        hasLegacy = true;
        legacy = JSON.parse(raw) as unknown;
      }
    } catch {
      // Malformed legacy JSON is handled like a damaged IndexedDB record.
      if (hasLegacy) legacy = null;
    }

    let avatarId: HelmetColor | undefined;
    try {
      const savedColor = legacyStorage?.getItem('szprycha:helmet-color');
      avatarId = helmetColors.find((color) => color === savedColor);
    } catch {
      // Use the default avatar if the previous local setting is unavailable.
    }

    let fallback: ReturnType<typeof decodeProfile> | undefined;
    const getFallback = () => (fallback ??= decodeProfile(legacy, avatarId));
    const openIndexed = () =>
      this.openIndexedDB(
        factory,
        legacyStorage,
        hasLegacy,
        getFallback,
        avatarId,
      );
    if (!native) return openIndexed();

    let loaded: ReturnType<typeof decodeProfile> | undefined;
    let future = false;
    try {
      await native(async (raw) => {
        if (hasFutureVersion(raw)) {
          future = true;
          return raw;
        }
        if (raw !== undefined) {
          const saved = decodeProfile(raw, avatarId);
          if (!saved.reset) {
            loaded = saved;
            return profileSchema.safeParse(raw).success ? raw : saved.profile;
          }
        }
        // Keep the source record until a native write succeeds, so a retry can
        // recover existing progress. Never replace a newer schema in either store.
        if (factory) {
          const database = await openDatabase(factory);
          try {
            const source = await get<unknown>(
              progressRecordKey,
              indexedStore(database),
            );
            if (hasFutureVersion(source)) {
              future = true;
              return raw;
            }
            if (source !== undefined) loaded = decodeProfile(source, avatarId);
          } finally {
            database.close();
          }
        }
        return (loaded ??= getFallback()).profile;
      });
      if (!future) retireLegacy(legacyStorage, hasLegacy);
      loaded ??= getFallback();
      const progress = new ProgressStore(
        loaded.profile,
        future ? undefined : native,
      );
      progress.reset = loaded.reset;
      return progress;
    } catch {
      return openIndexed();
    }
  }

  private static async openIndexedDB(
    factory: IDBFactory | undefined,
    legacyStorage: LegacyStorage | undefined,
    hasLegacy: boolean,
    getFallback: () => ReturnType<typeof decodeProfile>,
    avatarId?: HelmetColor,
  ): Promise<ProgressStore> {
    let database: IDBDatabase | undefined;
    try {
      if (factory) {
        database = await openDatabase(factory);
        const store = indexedStore(database);
        const write: UpdateProgress = (edit) =>
          update<unknown>(progressRecordKey, edit, store);
        let loaded: ReturnType<typeof decodeProfile> | undefined;
        await write((raw) => {
          if (hasFutureVersion(raw))
            throw new Error('Unsupported progress version');
          if (raw !== undefined) loaded = decodeProfile(raw, avatarId);
          return (loaded ??= getFallback()).profile;
        });
        retireLegacy(legacyStorage, hasLegacy);
        const { profile, reset } = loaded ?? getFallback();
        const progress = new ProgressStore(profile, write);
        progress.reset = reset;
        return progress;
      }
    } catch {
      database?.close();
    }
    const { profile, reset } = getFallback();
    const progress = new ProgressStore(profile);
    progress.reset = reset;
    return progress;
  }

  change<T>(edit: (profile: ProgressProfile) => T): T {
    const version = this.rankingXpVersion;
    const at = version ? Date.now() : 0;
    const apply = (profile: ProgressProfile) =>
      trackRankingXp(profile, version, at, () => edit(profile));
    const result = apply(this.profile);
    this.save(apply);
    return result;
  }

  prepareRide(rules: readonly { id: string }[]) {
    for (const { id } of rules) {
      if (
        !Object.hasOwn(this.profile.mastery, id) &&
        !this.unusedMastery.has(id)
      )
        this.unusedMastery.set(id, { value: 0, goodToday: 0 });
    }
    this.currentDay();
  }

  recordRide(
    verdicts: readonly RideVerdict[],
    longest: number,
    balance: MasteryBalance,
    day?: string,
    milestones?: Milestones,
  ) {
    const batch = this.ride;
    const persistent = !this.sessionOnly;
    if (verdicts.length) {
      const rideDay = day ?? this.currentDay();
      const at = this.rankingXpVersion ? Date.now() : 0;
      let clean = Boolean(milestones);
      for (let i = 0; clean && i < verdicts.length; i++)
        clean = verdicts[i]!.kind === 'good';
      batch.milestones = milestones ?? batch.milestones;
      if (!clean) this.cleanStreak = 0;
      for (let i = 0; i < verdicts.length; i++) {
        const { kind, ruleId } = verdicts[i]!;
        // A tick with any violation earns no milestone or challenge credit.
        const eligibleSeries = clean ? ++this.cleanStreak : -1;
        if (clean) {
          if (this.rankingXpVersion)
            trackRankingXp(this.profile, this.rankingXpVersion, at, () =>
              milestones!.good(this.profile, ruleId, eligibleSeries, rideDay),
            );
          else milestones!.good(this.profile, ruleId, eligibleSeries, rideDay);
        }
        applyMastery(
          this.profile.mastery,
          ruleId,
          kind,
          balance,
          rideDay,
          this.unusedMastery,
        );
        if (persistent) {
          batch.ruleIds.push(ruleId);
          batch.kinds.push(kind);
          batch.balances.push(balance);
          batch.days.push(rideDay);
          batch.cleanSeries.push(eligibleSeries);
          if (this.rankingXpVersion) batch.times.push(at);
        }
      }
      const { progression } = this.profile;
      progression.longestSeries = Math.max(progression.longestSeries, longest);
      batch.longest = Math.max(batch.longest, longest);
    }
    if (persistent && batch.ruleIds.length && ++batch.ticks >= rideSaveTicks)
      this.save();
  }

  private currentDay() {
    const { date } = this;
    date.setTime(Date.now());
    const key =
      date.getFullYear() * 10_000 + date.getMonth() * 100 + date.getDate();
    if (key !== this.dayKey) {
      this.day = localDay(date);
      this.dayKey = key;
    }
    return this.day;
  }

  private save(edit?: (profile: ProgressProfile) => unknown) {
    const batch = this.ride.ruleIds.length ? this.ride : undefined;
    if (batch) this.ride = new RideBatch();
    const { updateProgress } = this;
    if (!updateProgress || this.sessionOnly || (!batch && !edit)) return;

    // IndexedDB orders readwrite transactions on this store across tabs. Start
    // immediately so pagehide can submit a write within the event handler.
    const write = updateProgress((raw) => {
      const profile = raw as ProgressProfile | undefined;
      if (this.sessionOnly || profile?.version !== profileVersion)
        throw new Error('Progress record unavailable');
      batch?.apply(profile, this.rankingXpVersion);
      edit?.(profile);
      return { ...profile };
    }).catch(() => {
      this.sessionOnly = true;
      if (this.ride.ruleIds.length) this.ride = new RideBatch();
    });
    this.queue = this.queue.then(() => write);
  }

  async rankingProfile(): Promise<ProgressProfile> {
    await this.flush();
    const update = this.updateProgress;
    if (update && !this.sessionOnly) {
      let saved: ProgressProfile | undefined;
      try {
        await update((raw) => {
          const profile = raw as ProgressProfile | undefined;
          if (profile?.version === profileVersion) saved = profile;
          return raw;
        });
        if (saved) return saved;
      } catch {
        // In session-only mode the in-memory profile is the remaining copy.
        this.sessionOnly = true;
      }
    }
    return this.profile;
  }

  flush() {
    this.save();
    return this.queue;
  }
}
