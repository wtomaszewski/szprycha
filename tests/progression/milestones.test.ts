import { IDBDatabase, IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { ProgressStore, type RideVerdict } from '../../src/core/progressStore';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { BreakReminder } from '../../src/progression/breakReminder';
import type { ModuleId } from '../../src/progression/mastery';
import { generateDailyChallenges } from '../../src/progression/milestones';
import { TICKS_PER_SECOND } from '../../src/rules/types';
import { readContent } from '../../tools/content';

const content = await readContent();
const { balans } = content;
const date = '2026-11-22';
const fakePhoto = 'data:image/png;base64,iVBORw0KGgo=';
const stop: RideVerdict = { ruleId: 'ZNAK-STOP', kind: 'good' };
const kurier = balans.rangi.find(({ id }) => id === 'kurier')!;

function configured(store = new ProgressStore()) {
  const progress = new MissionProgress(store);
  progress.milestones(content);
  return progress;
}

function ride(
  progress: MissionProgress,
  ruleId: string,
  times: number,
  day = date,
) {
  const verdict: RideVerdict = { ruleId, kind: 'good' };
  for (let n = 0; n < times; n++)
    progress.recordRide([verdict], n + 1, balans.mastery, day);
}

describe('docs/04 §8 — achievements and collection', () => {
  it('pays once at the data threshold and makes the reward count toward XP', () => {
    const progress = configured();
    const award = content.osiagniecia.osiagniecia.find(
      ({ id }) => id === 'reka_w_gore',
    )!;
    expect(award.warunek).toEqual({ good: 'MAN-01', ile: 50 });
    const good: RideVerdict = { ruleId: 'MAN-01', kind: 'good' };
    const minor: RideVerdict = { ruleId: 'MAN-01', kind: 'minor' };
    for (let i = 0; i < 49; i++) {
      progress.recordRide([minor], 1, balans.mastery, date);
      progress.recordRide([good], 1, balans.mastery, date);
    }
    expect(progress.tokens).toBe(0);
    progress.recordRide([good], 2, balans.mastery, date);
    progress.recordRide([good], 3, balans.mastery, date);
    expect(progress.tokens).toBe(award.zetony);
    expect(progress.xp).toBe(award.zetony * balans.osiagniecia.xp_za_zeton);
    expect(progress.store.profile.mastery['MAN-01']?.goodToday).toBe(30);
  });

  it.each(['minor', 'major'] as const)(
    'ignores a %s and any good verdicts in the same tick for awards',
    (kind) => {
      const progress = configured();
      progress.store.profile.missionPoints = kurier.xp! * 2;
      const today = progress.dailyChallenges(content, date);
      const challenge = today[0]!;
      for (let n = 0; n < 50; n++)
        progress.recordRide(
          [
            { ruleId: 'MAN-01', kind },
            { ruleId: 'MAN-01', kind: 'good' },
            { ruleId: challenge.good, kind: 'good' },
          ],
          n + 1,
          balans.mastery,
          date,
        );
      expect(progress.tokens).toBe(0);
      expect(progress.store.profile.achievementXp).toEqual({});
      expect(progress.store.profile.goodHabits).toEqual({});
      expect(progress.dailyChallenges(content, date)).toEqual(today);
    },
  );

  it('uses module totals, conjunctive conditions and clean series', () => {
    const progress = configured();
    ride(progress, 'PIER-09', 20);
    ride(progress, 'MSC-02', 9);
    expect(progress.store.profile.achievementXp).toHaveProperty('seria_5');
    expect(progress.store.profile.achievementXp).not.toHaveProperty(
      'tramwajarz',
    );
    ride(progress, 'MSC-02', 1);
    expect(progress.store.profile.achievementXp).toHaveProperty('tramwajarz');
    ride(progress, 'PIER-01', 79);
    expect(progress.store.profile.achievementXp).not.toHaveProperty(
      'pan_pierwszenstwo',
    );
    ride(progress, 'PIER-02', 100);
    expect(progress.store.profile.achievementXp).toMatchObject({
      pan_pierwszenstwo: 100,
      seria_100: 160,
    });
  });

  it('resets the achievement streak on a dirty tick, including its trailing good verdicts', () => {
    const progress = configured();
    ride(progress, 'MAN-04', 11);
    progress.recordRide(
      [
        { ruleId: 'MAN-01', kind: 'minor' },
        { ruleId: 'MAN-04', kind: 'good' },
      ],
      11,
      balans.mastery,
      date,
    );
    ride(progress, 'MAN-04', 11);
    expect(progress.store.profile.achievementSeries).toBe(11);
    expect(progress.store.profile.achievementXp).not.toHaveProperty('seria_5');
    ride(progress, 'MAN-04', 1);
    expect(progress.store.profile.achievementXp).toHaveProperty('seria_5');
  });

  it('counts only clean completions and keeps future or violation-triggered systems inactive', () => {
    const progress = configured();
    const mission = content.misje.find(
      ({ zleceniodawca }) => zleceniodawca === 'pani_halina',
    )!;
    const reward = {
      points: 1000,
      stars: 0,
      balance: balans.gwiazdki,
    } as const;
    for (let i = 0; i < 20; i++) {
      progress.recordControlAnswer('ZNAK-STOP', true, balans.mastery);
      progress.complete(mission, { ...reward, clean: false });
    }
    expect(progress.store.profile.cleanMissions).toEqual({});
    expect(progress.tokens).toBe(0);
    for (let i = 0; i < 10; i++)
      progress.complete(mission, { ...reward, clean: true });
    expect(progress.store.profile.achievementXp).toEqual({ dobry_sasiad: 60 });
    for (const id of ['zloty_plac', 'dwa_miasta', 'krasnologia', 'madra_glowa'])
      expect(
        content.osiagniecia.osiagniecia.find((a) => a.id === id)?.aktywne,
      ).toBe(false);
  });

  it('stores unique catalog photos, pays the full-album award once and restores it on reload', async () => {
    const factory = new IDBFactory();
    const progress = configured(await ProgressStore.open(factory));
    expect(progress.photograph(content, 'B-9999', fakePhoto)).toBe(false);
    for (const { kod } of content.znaki.znaki.slice(0, -1))
      expect(progress.photograph(content, kod, fakePhoto)).toBe(true);
    expect(progress.tokens).toBe(0);
    const last = content.znaki.znaki.at(-1)!.kod;
    expect(progress.photograph(content, last, fakePhoto)).toBe(true);
    expect(progress.photograph(content, last, fakePhoto)).toBe(false);
    await progress.store.flush();
    const reloaded = await ProgressStore.open(factory);
    expect(reloaded.profile.signPhotos['A-7']).toBe(fakePhoto);
    expect(reloaded.profile.progression.tokens).toBe(100);
    expect(reloaded.profile.achievementXp).toEqual({ kolekcjoner: 200 });
  });
});

describe('docs/04 §9 — daily challenges', () => {
  it('is deterministic per date and seed and fills the priority slots with the weakest playable module', () => {
    const rules = content.przepisy.przepisy;
    const templates = content.wyzwania.wyzwania.map((item) => ({
      ...item,
      module: rules.find(({ id }) => id === item.good)!.modul,
    }));
    const mastery = (module: ModuleId) =>
      module === 'M08' ? 0 : module === 'M03' ? 13 : 50;
    const generate = (day: string, seed: number) =>
      generateDailyChallenges(
        day,
        seed,
        templates,
        mastery,
        balans.wyzwania_dzienne,
      );
    const today = generate(date, 42);
    expect(today).toEqual(generate(date, 42));
    expect(today).toHaveLength(3);
    expect(new Set(today.map(({ id }) => id)).size).toBe(3);
    expect(today.slice(0, 2).map(({ module }) => module)).toEqual([
      'M03',
      'M03',
    ]);
    expect(
      new Set(
        Array.from({ length: 16 }, (_, seed) =>
          JSON.stringify(generate(date, seed)),
        ),
      ).size,
    ).toBeGreaterThan(1);
    expect(
      new Set(
        Array.from({ length: 16 }, (_, day) =>
          JSON.stringify(
            generate(`2026-12-${String(day + 1).padStart(2, '0')}`, 42),
          ),
        ),
      ).size,
    ).toBeGreaterThan(1);
  });

  it('retains earned rewards across skipped days and only pays again for new good behavior', () => {
    const progress = configured();
    expect(progress.dailyChallenges(content, date)).toEqual([]);
    progress.store.profile.missionPoints = kurier.xp! * 2;
    for (const { id, modul } of content.przepisy.przepisy)
      if (modul !== 'M03')
        progress.store.profile.mastery[id] = { value: 100, goodToday: 0 };
    const today = progress.dailyChallenges(content, date);
    const first = today.find(({ id }) => id === 'stop')!;
    const second = today.find(({ id }) => id === 'swiatla')!;
    ride(progress, first.good, first.ile + 2);
    expect(
      progress.dailyChallenges(content, date).find(({ id }) => id === first.id),
    ).toMatchObject({
      count: first.ile,
      completed: true,
    });
    const tokens = progress.tokens;
    expect(tokens).toBe(balans.wyzwania_dzienne.zetony);
    expect(progress.store.profile.stickers).toEqual([first.naklejka]);
    const later = '2026-12-10';
    expect(progress.dailyChallenges(content, later)).toHaveLength(3);
    expect(
      progress
        .dailyChallenges(content, later)
        .every(({ count }) => count === 0),
    ).toBe(true);
    expect(progress.dailyChallenges(content, date)).toEqual([]);
    ride(progress, second.good, second.ile);
    expect(progress.tokens).toBe(tokens);
    expect(progress.store.profile.stickers).toEqual([first.naklejka]);
  });

  it('batches achievement and daily counters with mastery and merges payouts across tabs', async () => {
    const factory = new IDBFactory();
    const a = configured(await ProgressStore.open(factory));
    a.store.change((profile) => {
      profile.missionPoints = kurier.xp! * 2;
      for (const { id, modul } of content.przepisy.przepisy)
        if (modul !== 'M03') profile.mastery[id] = { value: 100, goodToday: 0 };
    });
    const challenge = a
      .dailyChallenges(content, date)
      .find(({ id }) => id === 'stop');
    expect(challenge).toBeDefined();
    await a.store.flush();
    const b = configured(await ProgressStore.open(factory));
    const transactions = vi.spyOn(IDBDatabase.prototype, 'transaction');
    try {
      for (const progress of [a, b]) {
        ride(progress, challenge!.good, challenge!.ile);
        ride(progress, stop.ruleId, 25);
      }
      expect(transactions).not.toHaveBeenCalled();
      await Promise.all([a.store.flush(), b.store.flush()]);
      expect(transactions).toHaveBeenCalledTimes(2);
    } finally {
      transactions.mockRestore();
    }
    const reloaded = await ProgressStore.open(factory);
    const profile = reloaded.profile;
    expect(
      profile.daily?.entries.find(({ id }) => id === challenge!.id),
    ).toEqual({ id: challenge!.id, count: challenge!.ile, completed: true });
    expect(profile.stickers).toEqual([challenge!.naklejka]);
    expect(profile.goodHabits['ZNAK-STOP']).toBe(50 + challenge!.ile * 2);
    expect(profile.achievementXp).toEqual({
      seria_5: 40,
      stop_znaczy_stop: 50,
    });
    expect(profile.progression.tokens).toBe(
      20 + 25 + balans.wyzwania_dzienne.zetony,
    );
  });

  it('replays a batch through midnight in date order', async () => {
    const factory = new IDBFactory();
    const progress = configured(await ProgressStore.open(factory));
    progress.store.change((profile) => {
      profile.missionPoints = kurier.xp! * 2;
    });
    const [today] = progress.dailyChallenges(content, date);
    await progress.store.flush();
    const tomorrow = '2026-11-23';
    ride(progress, today!.good, today!.ile);
    for (let i = today!.ile; i < 5 * TICKS_PER_SECOND; i++)
      progress.recordRide([], 0, balans.mastery, tomorrow);
    progress.recordRide(
      [{ kind: 'minor', ruleId: 'MAN-01' }],
      0,
      balans.mastery,
      tomorrow,
    );
    const [next] = progress.dailyChallenges(content, tomorrow);
    ride(progress, next!.good, next!.ile, tomorrow);
    await progress.store.flush();
    const profile = (await ProgressStore.open(factory)).profile;
    expect(profile.daily?.date).toBe(tomorrow);
    expect(profile.progression.tokens).toBe(2 * balans.wyzwania_dzienne.zetony);
    expect(profile.stickers).toContain(today!.naklejka);
    expect(profile.stickers).toContain(next!.naklejka);
  });
});

describe('docs/04 §10 — breaks', () => {
  it('suggests one break at 30 minutes of active play and keeps play and earnings independent', () => {
    const progress = configured();
    const minutes = progress.breakMinutes(balans.zdrowe_granie);
    expect(minutes).toBe(30);
    expect(progress.playFor(1799, minutes)).toBe(false);
    expect(progress.playFor(1, minutes)).toBe(true);
    expect(progress.playFor(1800, minutes)).toBe(false);
    expect(progress.tokens).toBe(0);
    expect(progress.xp).toBe(0);
    ride(progress, 'MAN-01', 50);
    expect(progress.store.profile.achievementXp).toHaveProperty('reka_w_gore');
  });

  it('uses and persists a supported time setting', async () => {
    const factory = new IDBFactory();
    const progress = configured(await ProgressStore.open(factory));
    const balance = balans.zdrowe_granie;
    progress.setBreakMinutes(15, balance);
    progress.setBreakMinutes(0, balance);
    await progress.store.flush();
    const next = configured(await ProgressStore.open(factory));
    expect(next.breakMinutes(balance)).toBe(15);
    const reminder = new BreakReminder();
    expect(reminder.advance(899, next.breakMinutes(balance))).toBe(false);
    expect(reminder.advance(1, next.breakMinutes(balance))).toBe(true);
  });
});
