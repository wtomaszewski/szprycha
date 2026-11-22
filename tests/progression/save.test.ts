import { IDBDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { expect, it, vi } from 'vitest';
import {
  legacyProgressKey,
  progressDatabase,
  progressRecordKey,
  progressStoreName,
  ProgressStore,
} from '../../src/core/progressStore';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { TICKS_PER_SECOND, type Verdict } from '../../src/rules/types';
import { readContent } from '../../tools/content';

const { balans, misje } = await readContent();
const first = misje[0]!;
const legacy = {
  completed: [first.id, first.id],
  introduced: ['ZNAK-STOP'],
  progression: { bestStars: { [first.id]: 2 }, tokens: 20, longestSeries: 9 },
};
const reward = { points: 1011, stars: 3, balance: balans.gwiazdki } as const;
const good = [{ ruleId: 'ZNAK-STOP', kind: 'good' }] as const;

function localStorageFor(data: string) {
  let value: string | null = data;
  return {
    getItem: vi.fn(() => value),
    removeItem: vi.fn(() => {
      value = null;
    }),
  };
}

async function seed(factory: IDBFactory, value: unknown) {
  await new Promise<void>((resolve, reject) => {
    const open = factory.open(progressDatabase, 1);
    open.onupgradeneeded = () =>
      open.result.createObjectStore(progressStoreName);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(progressStoreName, 'readwrite');
      tx.objectStore(progressStoreName).put(value, progressRecordKey);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}

it('migrates the M5a localStorage profile and retires it after the commit', async () => {
  const factory = new IDBFactory();
  const storage = localStorageFor(JSON.stringify(legacy));
  const store = await ProgressStore.open(factory, storage);
  expect(store).toMatchObject({ reset: false, sessionOnly: false });
  expect(store.profile).toMatchObject({
    ...legacy,
    completed: [first.id],
    version: 4,
    missionPoints: 0,
    mastery: {},
  });
  expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith(legacyProgressKey);
  const progress = new MissionProgress(store);
  expect(progress.complete(first, reward)).toBe(15);
  for (let i = 0; i < 3; i++)
    progress.recordRide(good, i + 1, balans.mastery, '2026-11-21');
  await store.flush();

  const next = new MissionProgress(await ProgressStore.open(factory, storage));
  expect(next.xp).toBe(505.5);
  expect(next.tokens).toBe(35);
  expect(next.longestSeries).toBe(9);
  expect(next.bestScore(first.id)).toBe(1011);
  expect(next.store.profile.nicknameSeed).toBe(store.profile.nicknameSeed);
  next.recordRide(good, 1, balans.mastery, '2026-11-21');
  expect(next.ruleMastery('ZNAK-STOP')).toBe(30);
  next.recordRide(good, 2, balans.mastery, '2026-11-22');
  expect(next.ruleMastery('ZNAK-STOP')).toBe(40);
  await next.store.flush();
});

it('upgrades an IndexedDB v1 record and prefers it over remaining localStorage', async () => {
  const factory = new IDBFactory();
  await seed(factory, { version: 1, ...legacy });
  const stale = localStorageFor(JSON.stringify({ completed: [] }));
  const store = await ProgressStore.open(factory, stale);
  expect(store.profile).toMatchObject({
    ...legacy,
    completed: [first.id],
    version: 4,
    bestScores: {},
    quizXp: 0,
  });
  expect(store.reset).toBe(false);
  expect((await ProgressStore.open(factory)).profile).toEqual(store.profile);
});

it.each(['legacy', 'indexeddb'])(
  'resets a corrupt %s record and reports it once',
  async (source) => {
    const factory = new IDBFactory();
    const storage =
      source === 'legacy' ? localStorageFor('{broken') : undefined;
    if (source === 'indexeddb')
      await seed(factory, {
        version: 2,
        completed: [first.id],
        missionPoints: -1000,
      });
    const store = await ProgressStore.open(factory, storage);
    expect(store).toMatchObject({ reset: true, sessionOnly: false });
    expect(store.profile).toMatchObject({
      version: 4,
      completed: [],
      missionPoints: 0,
    });
    expect(await ProgressStore.open(factory, storage)).toMatchObject({
      reset: false,
      profile: store.profile,
    });
  },
);

it('keeps playing in session memory when IndexedDB is unavailable or rejects access', async () => {
  const denied = new IDBFactory();
  vi.spyOn(denied, 'open').mockImplementation(() => {
    throw new DOMException('Denied', 'SecurityError');
  });
  for (const factory of [undefined, denied]) {
    const storage = localStorageFor(JSON.stringify(legacy));
    const store = await ProgressStore.open(factory, storage);
    const progress = new MissionProgress(store);
    expect(store.sessionOnly).toBe(true);
    expect(store.profile.completed).toEqual([first.id]);
    progress.complete(first, reward);
    expect(progress.xp).toBe(505.5);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(
      (await ProgressStore.open(factory, storage)).profile.missionPoints,
    ).toBe(0);
  }
});

it('preserves M5b progress when adding the album and milestone counters', async () => {
  const factory = new IDBFactory();
  const profile = {
    ...legacy,
    version: 2,
    nicknameSeed: 42,
    missionPoints: 4200,
    bestScores: { [first.id]: 1200 },
    quizXp: 30,
    achievementXp: { old: 20 },
    licencePassed: false,
    mastery: {
      'ZNAK-STOP': { value: 80, goodDay: '2026-11-22', goodToday: 10 },
    },
  };
  await seed(factory, profile);
  const store = await ProgressStore.open(factory);
  expect(store.reset).toBe(false);
  expect(store.profile).toMatchObject({
    ...profile,
    version: 4,
    signPhotos: {},
    goodHabits: {},
    cleanMissions: {},
    stickers: [],
  });
  expect((await ProgressStore.open(factory)).profile).toEqual(store.profile);
});

it('migrates a v3 game profile and saves quiz progress through a reload', async () => {
  const factory = new IDBFactory();
  const { quiz, ...existing } = new ProgressStore().profile;
  const v3 = { ...existing, version: 3, selectedCity: 'wroclaw', quizXp: 12 };
  await seed(factory, v3);

  const store = await ProgressStore.open(factory);
  expect(store.reset).toBe(false);
  expect(store.profile).toEqual({ ...v3, version: 4, quiz });
  const progress = new MissionProgress(store);
  const content = await readContent();
  const question = content.pytania.pytania.find(({ id }) => id === 'Q011')!;
  await progress.recordStudyAnswer(content, question, true, '2026-11-22');

  const reloaded = new MissionProgress(await ProgressStore.open(factory));
  expect(reloaded.selectedCity).toBe('wroclaw');
  expect(reloaded.store.profile.quiz).toEqual({
    day: 1,
    lastDay: '2026-11-22',
    cards: { Q011: { box: 2, dueDay: 2 } },
    streak: 1,
  });
  expect(reloaded.xp).toBe(12 + balans.quiz.xp_za_odpowiedz);
  expect(reloaded.ruleMastery('GDZIE-10')).toBe(balans.mastery.quiz_ok);
  expect(reloaded.ruleMastery('GDZIE-04')).toBe(balans.mastery.quiz_ok);
  expect(reloaded.moduleMastery('M02', content)).toBeGreaterThan(0);
});

it('adds the city choice to an existing profile and preserves the rest of the save', async () => {
  const factory = new IDBFactory();
  await seed(factory, { version: 1, ...legacy });
  const store = await ProgressStore.open(factory);
  const existing = structuredClone(store.profile);
  const progress = new MissionProgress(await ProgressStore.open(factory));
  expect(progress.selectedCity).toBe('warszawa');
  await progress.selectCity('wroclaw');
  const reloaded = await ProgressStore.open(factory);
  expect(reloaded.profile).toEqual({ ...existing, selectedCity: 'wroclaw' });
  await new MissionProgress(reloaded).selectCity('warszawa');
  expect((await ProgressStore.open(factory)).profile.selectedCity).toBe(
    'warszawa',
  );
});

it('preserves an unsupported future save', async () => {
  const factory = new IDBFactory();
  const future = { version: 5, data: 'future' };
  await seed(factory, future);
  const store = await ProgressStore.open(factory);
  expect(store).toMatchObject({ reset: false, sessionOnly: true });
  expect((await ProgressStore.open(factory)).sessionOnly).toBe(true);
});

it('writes at most once in five seconds of ride ticks and flushes the remaining verdicts', async () => {
  const factory = new IDBFactory();
  const store = await ProgressStore.open(factory);
  const progress = new MissionProgress(store);
  const write = vi.spyOn(IDBObjectStore.prototype, 'put');
  const transaction = vi.spyOn(IDBDatabase.prototype, 'transaction');
  const tickCount = 5 * TICKS_PER_SECOND;
  const day = '2026-11-22';
  const verdict = { ruleId: 'ZNAK-STOP', kind: 'good' as Verdict['kind'] };
  const verdicts = [verdict];

  try {
    for (let i = 1; i < tickCount; i++)
      progress.recordRide(verdicts, i, balans.mastery, day);
    expect(transaction).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(progress.ruleMastery('ZNAK-STOP')).toBe(30);
    expect(progress.longestSeries).toBe(tickCount - 1);

    // A tick without a verdict still advances the game's save window.
    progress.recordRide([], tickCount - 1, balans.mastery, day);
    expect(transaction).toHaveBeenCalledTimes(1);
    await store.flush();
    expect(write).toHaveBeenCalledTimes(1);

    verdict.kind = 'major';
    progress.recordRide(verdicts, tickCount, balans.mastery, day);
    verdict.kind = 'minor';
    verdicts.length = 0;
    await store.flush();
    await store.flush();
    expect(write).toHaveBeenCalledTimes(2);
  } finally {
    transaction.mockRestore();
    write.mockRestore();
  }

  const reloaded = new MissionProgress(await ProgressStore.open(factory));
  expect(reloaded.ruleMastery('ZNAK-STOP')).toBe(10);
  expect(reloaded.longestSeries).toBe(tickCount);
});

it('keeps concurrent tab writes and pays each star or achievement only once on disk', async () => {
  const factory = new IDBFactory();
  const [firstTab, secondTab] = await Promise.all(
    [1, 2].map(
      async () => new MissionProgress(await ProgressStore.open(factory)),
    ),
  );
  for (const tab of [firstTab!, secondTab!]) {
    tab.complete(first, reward);
    tab.awardAchievement('seria_5', 50);
    tab.recordRide(good, 1, balans.mastery, '2026-11-22');
  }
  await Promise.all([firstTab!.store.flush(), secondTab!.store.flush()]);
  const progress = new MissionProgress(await ProgressStore.open(factory));
  expect(progress.tokens).toBe(35);
  expect(progress.xp).toBe(1061);
  expect(progress.ruleMastery('ZNAK-STOP')).toBe(20);
});

it('merges quiz reviews across tabs and counts a promoted card only once', async () => {
  const factory = new IDBFactory();
  const [first, second] = await Promise.all(
    [1, 2].map(
      async () => new MissionProgress(await ProgressStore.open(factory)),
    ),
  );
  const content = await readContent();
  const [a, b] = content.pytania.pytania;
  const date = '2026-11-22';
  await Promise.all([
    first!.recordStudyAnswer(content, a!, true, date),
    second!.recordStudyAnswer(content, a!, true, date),
    second!.recordStudyAnswer(content, b!, true, date),
  ]);
  const reloaded = new MissionProgress(await ProgressStore.open(factory));
  expect(reloaded.store.profile.quiz.streak).toBe(2);
  expect(reloaded.xp).toBe(2 * balans.quiz.xp_za_odpowiedz);
  expect(Object.keys(reloaded.store.profile.quiz.cards)).toEqual([
    a!.id,
    b!.id,
  ]);
});
