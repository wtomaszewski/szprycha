import { preferencesProgress } from '../../src/platform/preferencesProgress';
import { defaultAudio } from '../../src/audio/settings';
import { IDBDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { expect, it, vi } from 'vitest';
import {
  legacyProgressKey,
  progressDatabase,
  progressRecordKey,
  progressStoreName,
  ProgressStore,
} from '../../src/core/progressStore';
import {
  storySeed,
  storySticker,
  storyTemplates,
} from '../../src/gameplay/procedural/storyTemplates';
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

const uuidV4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const migratedIdentity = {
  profileId: expect.any(String) as unknown,
  nickname: expect.any(String) as unknown,
  avatarId: 'gold',
  onlineRankings: false,
};

function previousProfile() {
  const profile = new ProgressStore().profile;
  for (const field of [
    'profileId',
    'nickname',
    'avatarId',
    'onlineRankings',
    'tutorial',
    'stories',
  ])
    Reflect.deleteProperty(profile, field);
  return profile;
}

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

it('only starts the tutorial automatically for a new local profile', async () => {
  const factory = new IDBFactory();
  const fresh = await ProgressStore.open(factory);
  expect(fresh.profile.tutorial).toBe('move');
  fresh.change((profile) => {
    profile.tutorial = 'left';
  });
  await fresh.flush();
  expect((await ProgressStore.open(factory)).profile.tutorial).toBe('left');

  const { tutorial, ...existing } = fresh.profile;
  expect(tutorial).toBe('left');
  const imported = new IDBFactory();
  await seed(imported, existing);
  expect((await ProgressStore.open(imported)).profile.tutorial).toBeUndefined();
});

it('migrates the M5a localStorage profile and retires it after the commit', async () => {
  const factory = new IDBFactory();
  const storage = localStorageFor(JSON.stringify(legacy));
  const store = await ProgressStore.open(factory, storage);
  expect(store).toMatchObject({ reset: false, sessionOnly: false });
  expect(store.profile).toMatchObject({
    ...legacy,
    completed: [first.id],
    version: 11,
    stories: {},
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
    version: 11,
    stories: {},
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
      version: 11,
      stories: {},
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
    version: 11,
    stories: {},
    signPhotos: {},
    goodHabits: {},
    cleanMissions: {},
    stickers: [],
  });
  expect((await ProgressStore.open(factory)).profile).toEqual(store.profile);
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

it('adds empty quiz progress to a v3 profile without changing its existing fields', async () => {
  const factory = new IDBFactory();
  const { audio, reducedEffects, reflectiveVest, ...profile } =
    previousProfile();
  const v3 = {
    ...profile,
    version: 3,
    quizXp: 40,
    selectedCity: 'wroclaw',
    stickers: ['kolo'],
  };
  Reflect.deleteProperty(v3, 'quiz');
  await seed(factory, v3);
  const store = await ProgressStore.open(factory);
  expect(store.reset).toBe(false);
  expect(store.profile).toEqual({
    ...v3,
    ...migratedIdentity,
    version: 11,
    stories: {},
    audio,
    reducedEffects,
    reflectiveVest,
    quiz: { cards: {}, streak: 0 },
  });
  expect((await ProgressStore.open(factory)).profile).toEqual(store.profile);
});

it('carries quiz cards, streak and an existing rank from v4 into the audio profile', async () => {
  const factory = new IDBFactory();
  const { audio, reducedEffects, reflectiveVest, ...profile } =
    previousProfile();
  const quiz = { cards: { Q001: { box: 2, due: '2026-11-23' } }, streak: 4 };
  await seed(factory, { ...profile, version: 4, licencePassed: true, quiz });
  expect((await ProgressStore.open(factory)).profile).toEqual({
    ...profile,
    ...migratedIdentity,
    stories: {},
    audio,
    reducedEffects,
    reflectiveVest,
    licencePassed: true,
    quiz,
  });
});

it('migrates a v5 licence profile and saves audio changes alongside existing progress', async () => {
  const factory = new IDBFactory();
  const { audio, reducedEffects, reflectiveVest, ...profile } =
    previousProfile();
  const licence = {
    date: '2026-11-22',
    theory: { correct: 9, total: 10 },
    practice: { points: 18, max: 20 },
  };
  const previous = { ...profile, version: 5, missionPoints: 550, licence };
  await seed(factory, previous);
  const first = await ProgressStore.open(factory);
  const second = await ProgressStore.open(factory);
  expect(first.reset).toBe(false);
  expect(first.profile).toEqual({
    ...previous,
    ...migratedIdentity,
    version: 11,
    stories: {},
    audio: defaultAudio,
    reducedEffects,
    reflectiveVest,
  });

  first.change(({ audio: settings }) => {
    settings.music = 0.34;
  });
  second.change(({ audio: settings }) => {
    settings.station = 'talk';
  });
  second.change(({ audio: settings }) => {
    settings.muted = true;
  });
  await Promise.all([first.flush(), second.flush()]);
  expect((await ProgressStore.open(factory)).profile).toEqual({
    ...previous,
    ...migratedIdentity,
    version: 11,
    stories: {},
    audio: { ...audio, music: 0.34, station: 'talk', muted: true },
    reducedEffects,
    reflectiveVest,
  });
});

it('keeps progression when audio settings in the current profile are damaged', async () => {
  const factory = new IDBFactory();
  const profile = new ProgressStore().profile;
  await seed(factory, {
    ...profile,
    audio: { ...defaultAudio, music: 4 },
    quizXp: 20,
  });
  const store = await ProgressStore.open(factory);
  expect(store.reset).toBe(false);
  expect(store.profile).toEqual({
    ...profile,
    quizXp: 20,
    audio: defaultAudio,
  });
});

it('migrates audio settings from v6 and persists the ride preferences', async () => {
  const factory = new IDBFactory();
  const { reducedEffects, reflectiveVest, ...previous } = previousProfile();
  await seed(factory, {
    ...previous,
    version: 6,
    audio: { ...defaultAudio, music: 0.34 },
  });
  const store = await ProgressStore.open(factory);
  expect(store.reset).toBe(false);
  expect(store.profile).toMatchObject({
    version: 11,
    stories: {},
    reducedEffects,
    reflectiveVest,
    audio: { music: 0.34 },
  });
  store.change((profile) => {
    profile.reducedEffects = true;
    profile.reflectiveVest = true;
  });
  await store.flush();
  expect((await ProgressStore.open(factory)).profile).toMatchObject({
    reducedEffects: true,
    reflectiveVest: true,
    audio: { music: 0.34 },
  });
});

it('upgrades the existing accessibility preferences and saves a touch layout alongside them', async () => {
  const factory = new IDBFactory();
  const previous = {
    ...previousProfile(),
    version: 7,
    missionPoints: 800,
    resultsTextSize: 'largest',
    resultsHighContrast: true,
    reducedEffects: true,
  };
  await seed(factory, previous);
  const store = await ProgressStore.open(factory);
  expect(store.reset).toBe(false);
  expect(store.profile).toEqual({
    ...previous,
    ...migratedIdentity,
    version: 11,
    stories: {},
  });
  const touchLayout = [
    'brake',
    'left',
    'look',
    'right',
    'bell',
    'lights',
    'dismount',
  ] as const;
  store.change((profile) => {
    profile.touchLayout = [...touchLayout];
  });
  await store.flush();
  expect((await ProgressStore.open(factory)).profile).toEqual({
    ...previous,
    ...migratedIdentity,
    version: 11,
    stories: {},
    touchLayout,
  });
});

it.each(['IndexedDB', 'Preferences'])(
  'migrates v8 in %s once, preserving the nick, helmet and save settings',
  async (storage) => {
    const previous = {
      ...previousProfile(),
      version: 8,
      nicknameSeed: 124,
      missionPoints: 900,
      breakMinutes: 45,
      haptics: false,
    };
    const factory = new IDBFactory();
    const local = {
      getItem: (key: string) =>
        key === 'szprycha:helmet-color' ? 'pink' : null,
      removeItem: vi.fn(),
    };
    let native;
    if (storage === 'IndexedDB') await seed(factory, previous);
    else
      native = preferencesProgress(
        progressRecordKey,
        fakePreferences(JSON.stringify(previous)),
      );
    const [first, second] = await Promise.all([
      ProgressStore.open(factory, local, native),
      ProgressStore.open(factory, local, native),
    ]);
    expect(first.reset).toBe(false);
    expect(first.profile).toEqual({
      ...previous,
      version: 11,
      stories: {},
      profileId: expect.stringMatching(uuidV4),
      nickname: 'Dzielna Szprycha 42',
      avatarId: 'pink',
      onlineRankings: false,
    });
    expect(second.profile).toEqual(first.profile);
    first.change((profile) => {
      profile.onlineRankings = true;
      profile.ageBand = 'under10';
      profile.breakMinutes = null;
      profile.nickname = 'Zwinna Wydra 17';
    });
    await first.flush();
    expect((await ProgressStore.open(factory, local, native)).profile).toEqual(
      first.profile,
    );
  },
);

it('migrates the version 9 profile to story progress without changing identity or rewards', async () => {
  const factory = new IDBFactory();
  const { stories, ...identity } = new ProgressStore().profile;
  expect(stories).toEqual({});
  const previous = {
    ...identity,
    version: 9,
    onlineRankings: true,
    selectedCity: 'wroclaw',
    completed: [first.id],
    missionPoints: 1011,
    progression: legacy.progression,
    stickers: ['kolo'],
  };
  await seed(factory, previous);
  const store = await ProgressStore.open(factory);
  expect(store.reset).toBe(false);
  expect(store.profile).toEqual({ ...previous, version: 11, stories: {} });
  expect((await ProgressStore.open(factory)).profile).toEqual(store.profile);
});

it('preserves Kraków training and city selection when upgrading a v10 profile', async () => {
  const factory = new IDBFactory();
  const previous = {
    ...new ProgressStore().profile,
    version: 10,
    selectedCity: 'wroclaw',
    freeRideCity: 'krakow',
    completed: ['KRA-B-01', 'KRA-B-02'],
    stories: { wroclaw: { seed: 123, step: 1, finished: 0 } },
  };
  await seed(factory, previous);
  const store = await ProgressStore.open(factory);
  const progress = new MissionProgress(store);
  expect(store.profile).toEqual({ ...previous, version: 11 });
  expect(progress.freeRideCity).toBe('krakow');
  await progress.selectCity('krakow');
  expect((await ProgressStore.open(factory)).profile).toEqual({
    ...previous,
    version: 11,
    selectedCity: 'krakow',
  });
});

it('persists story steps and grants a finale reward only once across open profiles', async () => {
  const city = 'warszawa';
  const factory = new IDBFactory();
  const store = await ProgressStore.open(factory);
  const progress = new MissionProgress(store);
  const seedValue = storySeed(city, store.profile.nicknameSeed);
  const { id: template, kinds, tokens } = storyTemplates[0];
  const story = { seed: seedValue, index: 0, total: kinds.length, template };
  progress.completeDailyOrder(city, 100, false);
  expect(store.profile.stories).toEqual({});
  expect(progress.completeDailyOrder(city, 100, true)).toEqual({
    tokens: 0,
    unlocked: true,
  });
  progress.completeDailyOrder(city, 100, true, { ...story, step: 1 });
  progress.completeDailyOrder(city, 100, false, { ...story, step: 0 });
  expect(store.profile.stories[city]?.step).toBe(0);
  progress.completeDailyOrder(city, 100, true, { ...story, step: 0 });
  progress.completeDailyOrder(city, 100, true, { ...story, step: 0 });
  await store.flush();

  const resumed = await ProgressStore.open(factory);
  const resumedProgress = new MissionProgress(resumed);
  expect(resumed.profile.stories).toEqual({
    [city]: { seed: seedValue, finished: 0, step: 1 },
  });
  resumedProgress.completeDailyOrder(city, 100, true, { ...story, step: 1 });
  await resumed.flush();
  const concurrent = await ProgressStore.open(factory);
  const finale = { ...story, step: 2 };
  const sticker = storySticker(city, template);

  expect(resumedProgress.completeDailyOrder(city, 100, true, finale)).toEqual({
    tokens,
    sticker,
  });
  new MissionProgress(concurrent).completeDailyOrder(city, 100, true, finale);
  await Promise.all([resumed.flush(), concurrent.flush()]);

  const saved = (await ProgressStore.open(factory)).profile;
  expect(saved.progression.tokens).toBe(tokens);
  expect(saved.stickers).toEqual([sticker]);
  expect(saved.stories).toEqual({
    [city]: { seed: seedValue, finished: 1, step: 0 },
  });
  expect(saved.missionPoints).toBe(500);
  expect(saved.completed).toEqual([]);
});

it('creates a v4 UUID when a WebView only exposes random bytes', () => {
  vi.stubGlobal('crypto', {
    getRandomValues: crypto.getRandomValues.bind(crypto),
  });
  try {
    expect(new ProgressStore().profile.profileId).toMatch(uuidV4);
  } finally {
    vi.unstubAllGlobals();
  }
});

it('preserves an unsupported future save', async () => {
  const factory = new IDBFactory();
  const future = { version: 12, data: 'future' };
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

function fakePreferences(initial: string | null = null) {
  let value = initial;
  return {
    get: vi.fn(async () => ({ value })),
    set: vi.fn(async (options: { value: string }) => {
      value = options.value;
    }),
  };
}

it('copies an older IndexedDB profile to Preferences and serializes later edits', async () => {
  const database = new IDBFactory();
  await seed(database, { version: 1, ...legacy });
  const plugin = fakePreferences();
  const native = preferencesProgress(progressRecordKey, plugin);
  const [first, second] = await Promise.all([
    ProgressStore.open(database, undefined, native),
    ProgressStore.open(database, undefined, native),
  ]);
  expect(plugin.set).toHaveBeenCalledTimes(1);
  expect(first.profile.progression.tokens).toBe(20);
  expect(first.profile.completed).toEqual([legacy.completed[0]]);
  expect(second.profile.nicknameSeed).toBe(first.profile.nicknameSeed);
  expect(second.profile.profileId).toBe(first.profile.profileId);

  for (const store of [first, second]) {
    store.change((profile) => {
      profile.progression.tokens += 2;
      profile.haptics = false;
    });
  }
  await Promise.all([first.flush(), second.flush()]);
  const reopened = await ProgressStore.open(database, undefined, native);
  expect(reopened.profile.progression.tokens).toBe(24);
  expect(reopened.profile.haptics).toBe(false);
  const web = await ProgressStore.open(database);
  expect(web.profile.progression.tokens).toBe(20);
});

it('keeps saving in IndexedDB if the first Preferences write fails and migrates it on retry', async () => {
  const database = new IDBFactory();
  await seed(database, { version: 1, ...legacy });
  const plugin = fakePreferences();
  plugin.set.mockRejectedValueOnce(new Error('Preferences unavailable'));
  const native = preferencesProgress(progressRecordKey, plugin);
  const fallback = await ProgressStore.open(database, undefined, native);
  expect(fallback.sessionOnly).toBe(false);
  fallback.change((profile) => profile.progression.tokens++);
  await fallback.flush();

  const migrated = await ProgressStore.open(database, undefined, native);
  expect(migrated.profile.progression.tokens).toBe(21);
  expect(plugin.set).toHaveBeenCalledTimes(2);
});

it('loads from IndexedDB when Preferences cannot be read and protects newer versions', async () => {
  const database = new IDBFactory();
  await seed(database, { version: 1, ...legacy });
  const plugin = fakePreferences(
    JSON.stringify({ version: 99, progress: 123 }),
  );
  plugin.get.mockRejectedValueOnce(new Error('Preferences unavailable'));
  const native = preferencesProgress(progressRecordKey, plugin);
  expect(
    (await ProgressStore.open(database, undefined, native)).profile.progression
      .tokens,
  ).toBe(20);
  const future = await ProgressStore.open(database, undefined, native);
  expect(future.sessionOnly).toBe(true);
  future.change((profile) => profile.progression.tokens++);
  await future.flush();
  expect(plugin.set).not.toHaveBeenCalled();
});

it('does not write a native profile over a newer IndexedDB schema', async () => {
  const database = new IDBFactory();
  await seed(database, { version: 99, progress: 123 });
  const plugin = fakePreferences();
  const native = preferencesProgress(progressRecordKey, plugin);
  const store = await ProgressStore.open(database, undefined, native);
  expect(store.sessionOnly).toBe(true);
  expect(plugin.set).not.toHaveBeenCalled();
});
