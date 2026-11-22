import { update, type UseStore } from 'idb-keyval';
import { z } from 'zod';

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

const profileSchema = z.strictObject({
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

export type ProgressProfile = z.infer<typeof profileSchema>;
type LegacyStorage = Pick<Storage, 'getItem' | 'removeItem'>;

function createProfile(legacy?: z.infer<typeof legacySchema>): ProgressProfile {
  return {
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
  };
}

function decodeProfile(raw: unknown) {
  const current = profileSchema.safeParse(raw);
  if (current.success) return { profile: current.data, reset: false };
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
    raw.version > 2
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
    const { store } = this;
    if (store && !this.sessionOnly) {
      this.queue = this.queue
        .then(async () => {
          if (this.sessionOnly) return;
          // Replay the edit against the latest record inside the same transaction.
          // A second tab can save without replacing progress earned in this tab.
          await update<unknown>(
            progressRecordKey,
            (raw) => {
              const profile = profileSchema.parse(raw);
              edit(profile);
              return profile;
            },
            store,
          );
        })
        .catch(() => {
          this.sessionOnly = true;
        });
    }
    return result;
  }

  flush() {
    return this.queue;
  }
}
