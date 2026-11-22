import { update, type UseStore } from 'idb-keyval';
import { z } from 'zod';
import { audioSettingsSchema, defaultAudio } from '../audio/settings';
import { missionCity } from '../content/missions';
import type { GameContent } from '../content/schemas';
import { placRecordsSchema } from '../gameplay/plac/placRecords';
import { leitnerBoxes } from '../gameplay/quiz/leitner';
import { applyMastery, localDay } from '../progression/mastery';
import type { Milestones } from '../progression/milestones';
import { touchLayoutSchema } from './touchLayout';
import { TICKS_PER_SECOND, type Verdict } from '../rules/types';

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

const profileVersion = 8;
const profileSchema = m8cProfileSchema.extend({
  version: z.literal(profileVersion),
  touchLayout: touchLayoutSchema,
});

export type ProgressProfile = z.infer<typeof profileSchema>;
export type RideVerdict = Pick<Verdict, 'kind' | 'ruleId'>;
type LegacyStorage = Pick<Storage, 'getItem' | 'removeItem'>;
type MasteryBalance = GameContent['balans']['mastery'];

const rideSaveTicks = 5 * TICKS_PER_SECOND;

class RideBatch {
  // Copy only the replay inputs, without retaining the scene's reusable verdicts.
  readonly ruleIds: string[] = [];
  readonly kinds: RideVerdict['kind'][] = [];
  readonly balances: MasteryBalance[] = [];
  readonly days: string[] = [];
  readonly cleanSeries: number[] = [];
  milestones?: Milestones;
  longest = 0;
  ticks = 0;

  apply(profile: ProgressProfile) {
    for (let i = 0; i < this.ruleIds.length; i++) {
      const rule = this.ruleIds[i]!;
      const day = this.days[i]!;
      const series = this.cleanSeries[i]!;
      if (series >= 0) this.milestones?.good(profile, rule, series, day);
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
): ProgressProfile {
  return {
    ...profile,
    version: profileVersion,
    reducedEffects: false,
    reflectiveVest: false,
  };
}

function addAudio(profile: z.infer<typeof m7cProfileSchema>): ProgressProfile {
  return addRidePreferences({
    ...profile,
    version: 6,
    audio: { ...defaultAudio },
  });
}

function addQuiz(profile: z.infer<typeof m5cProfileSchema>): ProgressProfile {
  return addAudio({ ...profile, version: 5, quiz: { cards: {}, streak: 0 } });
}

function upgrade(profile: z.infer<typeof m5bProfileSchema>): ProgressProfile {
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

function createProfile(legacy?: z.infer<typeof legacySchema>): ProgressProfile {
  return upgrade({
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
}

function decodeProfile(raw: unknown): {
  profile: ProgressProfile;
  reset: boolean;
} {
  const current = profileSchema.safeParse(raw);
  if (current.success) return { profile: current.data, reset: false };
  const m8c = m8cProfileSchema.safeParse(raw);
  if (m8c.success)
    return { profile: { ...m8c.data, version: profileVersion }, reset: false };
  const m8a = m8aProfileSchema.safeParse(raw);
  if (m8a.success)
    return { profile: addRidePreferences(m8a.data), reset: false };
  const m7c = m7cProfileSchema.safeParse(raw);
  if (m7c.success) return { profile: addAudio(m7c.data), reset: false };
  const m7b = m7bProfileSchema.safeParse(raw);
  if (m7b.success)
    return { profile: addAudio({ ...m7b.data, version: 5 }), reset: false };
  const m5c = m5cProfileSchema.safeParse(raw);
  if (m5c.success) return { profile: addQuiz(m5c.data), reset: false };
  const m5b = m5bProfileSchema.safeParse(raw);
  if (m5b.success) return { profile: upgrade(m5b.data), reset: false };
  const legacy = legacySchema.safeParse(raw);
  return {
    profile: createProfile(legacy.data),
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

  constructor(
    readonly profile = createProfile(),
    private readonly store?: UseStore,
  ) {
    this.sessionOnly = !store;
  }

  static async open(
    factory: IDBFactory | undefined,
    legacyStorage?: LegacyStorage,
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

    const fallback = decodeProfile(legacy);
    let database: IDBDatabase | undefined;
    try {
      if (factory) {
        database = await openDatabase(factory);
        const db = database;
        const store: UseStore = async (mode, callback) =>
          callback(
            db
              .transaction(progressStoreName, mode)
              .objectStore(progressStoreName),
          );
        let loaded = fallback;
        await update<unknown>(
          progressRecordKey,
          (raw) => {
            if (hasFutureVersion(raw))
              throw new Error('Unsupported progress version');
            if (raw !== undefined) loaded = decodeProfile(raw);
            return loaded.profile;
          },
          store,
        );
        // Retire v1 only once the IndexedDB transaction has committed.
        if (hasLegacy) {
          try {
            legacyStorage?.removeItem(legacyProgressKey);
          } catch {
            // IndexedDB already takes precedence on subsequent loads.
          }
        }
        const progress = new ProgressStore(loaded.profile, store);
        progress.reset = loaded.reset;
        return progress;
      }
    } catch {
      database?.close();
    }
    const progress = new ProgressStore(fallback.profile);
    progress.reset = fallback.reset;
    return progress;
  }

  change<T>(edit: (profile: ProgressProfile) => T): T {
    const result = edit(this.profile);
    this.save(edit);
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
      day ??= this.currentDay();
      let clean = Boolean(milestones);
      for (let i = 0; clean && i < verdicts.length; i++)
        clean = verdicts[i]!.kind === 'good';
      batch.milestones = milestones ?? batch.milestones;
      if (!clean) this.cleanStreak = 0;
      for (let i = 0; i < verdicts.length; i++) {
        const { kind, ruleId } = verdicts[i]!;
        // A tick with any violation earns no milestone or challenge credit.
        const eligibleSeries = clean ? ++this.cleanStreak : -1;
        if (clean) milestones!.good(this.profile, ruleId, eligibleSeries, day);
        applyMastery(
          this.profile.mastery,
          ruleId,
          kind,
          balance,
          day,
          this.unusedMastery,
        );
        if (persistent) {
          batch.ruleIds.push(ruleId);
          batch.kinds.push(kind);
          batch.balances.push(balance);
          batch.days.push(day);
          batch.cleanSeries.push(eligibleSeries);
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
    const { store } = this;
    if (!store || this.sessionOnly || (!batch && !edit)) return;

    // IndexedDB orders readwrite transactions on this store across tabs. Start
    // immediately so pagehide can submit a write within the event handler.
    const write = update<ProgressProfile | undefined>(
      progressRecordKey,
      (profile) => {
        if (this.sessionOnly || profile?.version !== profileVersion)
          throw new Error('Progress record unavailable');
        batch?.apply(profile);
        edit?.(profile);
        return profile;
      },
      store,
    ).catch(() => {
      this.sessionOnly = true;
      if (this.ride.ruleIds.length) this.ride = new RideBatch();
    });
    this.queue = this.queue.then(() => write);
  }

  flush() {
    this.save();
    return this.queue;
  }
}
