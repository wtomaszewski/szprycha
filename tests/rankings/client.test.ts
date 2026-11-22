import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { ProgressStore } from '../../src/core/progressStore';
import { RankingClient } from '../../src/rankings/RankingClient';
import {
  inputHash,
  qualifies,
  RideEvidence,
} from '../../src/rankings/evidence';
import { rankingQueueLimit, rankingWeekStart } from '../../src/rankings/state';
import type { RankingVersions } from '../../src/rankings/versions';

const version = '1'.repeat(64);
const timing = { version };
const versions: RankingVersions = {
  missions: { 'WAW-A1-01': { ...timing, city: 'warszawa' } },
  ride: { warszawa: timing, wroclaw: timing },
  plac: timing,
  weeklyXp: timing,
};
const arcade = {
  kind: 'plac',
  ticks: 2_040,
  minor: 0,
  major: 0,
  speedPercent: 100,
} as const;
const hash = () => Promise.resolve('2'.repeat(64));
const ok = () => new Response(null, { status: 204 });

async function fixture() {
  const db = new IDBFactory();
  const store = await ProgressStore.open(db);
  let online = false;
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async (url) =>
      new URL(String(url)).pathname.endsWith('/rules')
        ? Response.json(versions)
        : ok(),
    );
  const client = new RankingClient(
    store,
    'http://127.0.0.1:8787',
    versions,
    fetcher,
    () => online,
  );
  return {
    db,
    client,
    store,
    fetcher,
    connect: () => {
      online = true;
    },
  };
}

describe('ranking consent and uploads', () => {
  it('makes no requests before consent, even with the legacy placeholder enabled', async () => {
    const { client, store, fetcher, connect } = await fixture();
    store.change((profile) => {
      profile.onlineRankings = true;
    });
    connect();
    await client.flush();
    await expect(
      client.board({ board: 'plac' }, new AbortController().signal),
    ).rejects.toThrow();
    expect(await client.deleteProfile()).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('persists a bounded FIFO offline and retries transient failures after reload', async () => {
    const { client, db, fetcher, store } = await fixture();
    client.setEnabled(true);
    for (let seed = 0; seed <= rankingQueueLimit; seed++)
      await client.record(arcade, seed, client.consent!, hash);
    await store.flush();
    expect(fetcher).not.toHaveBeenCalled();
    const reloaded = await ProgressStore.open(db);
    expect(reloaded.profile.rankings!.queue).toHaveLength(rankingQueueLimit);
    expect(reloaded.profile.rankings!.queue[0]!.seed).toBe(1);

    const flaky = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(versions))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockImplementation(async (url) =>
        new URL(String(url)).pathname.endsWith('/rules')
          ? Response.json(versions)
          : ok(),
      );
    const restored = new RankingClient(
      reloaded,
      'http://127.0.0.1:8787',
      versions,
      flaky,
    );
    await restored.flush();
    expect(reloaded.profile.rankings!.queue).toHaveLength(rankingQueueLimit);

    // A fresh client simulates restarting the app after the failed request.
    await new RankingClient(
      reloaded,
      'http://127.0.0.1:8787',
      versions,
      flaky,
    ).flush();
    expect(reloaded.profile.rankings!.queue).toEqual([]);
    const posts = flaky.mock.calls.filter(
      ([, init]) => init?.method === 'POST',
    );
    expect(posts).toHaveLength(rankingQueueLimit + 1);
    expect(posts[0]![1]!.body).toEqual(posts[1]![1]!.body);
    expect(new Headers(posts[1]![1]!.headers).get('authorization')).toBe(
      'Bearer ' + store.profile.profileId,
    );
    expect(JSON.parse(String(posts[1]![1]!.body))).toMatchObject({
      nickname: store.profile.nickname,
      avatarId: store.profile.avatarId,
      score: { ...arcade, seed: 1, version, inputHash: await hash() },
    });
  });

  it('drops a run with a changed version and stops on opt-out', async () => {
    const { client, fetcher, store, connect } = await fixture();
    client.setEnabled(true);
    await client.record(arcade, 1, client.consent!, hash);
    fetcher.mockResolvedValueOnce(
      Response.json({ ...versions, plac: { version: '3'.repeat(64) } }),
    );
    connect();
    await client.flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(store.profile.rankings!.queue).toEqual([]);

    const oldConsent = client.consent!;
    client.setEnabled(false);
    await client.record(arcade, 2, oldConsent, hash);
    await client.flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('only publishes weekly XP earned during consent, with the Warsaw week', async () => {
    const { client, fetcher, store, connect } = await fixture();
    store.change((p) => {
      p.quizXp += 12;
    });
    client.setEnabled(true);
    store.change((p) => {
      p.missionPoints += 3;
    });
    store.change((p) => {
      p.quizXp += 4;
    });
    connect();
    await client.flush();
    await client.flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(String(fetcher.mock.calls[1]![1]!.body)).score,
    ).toMatchObject({
      kind: 'weekly-xp',
      xp: 5.5,
      week: rankingWeekStart(new Date()),
      version,
      inputHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(rankingWeekStart(new Date('2026-03-29T21:59:59Z'))).toBe(
      '2026-03-23',
    );
    expect(rankingWeekStart(new Date('2026-03-29T22:00:00Z'))).toBe(
      '2026-03-30',
    );
  });

  it('can delete after opt-out and preserves progress, including after an interrupted attempt', async () => {
    const { client, db, fetcher, store } = await fixture();
    store.change((p) => {
      p.completed.push('WAW-A1-01');
      p.quizXp = 45;
    });
    const { profileId, nickname, quizXp } = store.profile;
    client.setEnabled(true);
    await client.record(arcade, 1, client.consent!, hash);
    client.setEnabled(false);
    fetcher.mockRejectedValueOnce(new TypeError('offline'));
    expect(await client.deleteProfile()).toBe(false);
    const reloaded = await ProgressStore.open(db);
    expect(reloaded.profile.rankings).toMatchObject({
      queue: [],
      deleting: true,
    });
    expect(reloaded.profile.profileId).toBe(profileId);
    const restored = new RankingClient(
      reloaded,
      'http://127.0.0.1:8787',
      versions,
      fetcher,
    );
    expect(await restored.deleteProfile()).toBe(true);
    const request = fetcher.mock.calls[1]!;
    expect(String(request[0])).toBe('http://127.0.0.1:8787/v1/profile');
    expect(request[1]?.method).toBe('DELETE');
    expect(new Headers(request[1]?.headers).get('authorization')).toBe(
      'Bearer ' + profileId,
    );
    expect(request[1]?.body).toBeUndefined();
    expect((await ProgressStore.open(db)).profile).toMatchObject({
      profileId: expect.not.stringMatching(profileId),
      nickname,
      quizXp,
      completed: ['WAW-A1-01'],
      onlineRankings: false,
    });
    expect(reloaded.profile.rankings).toBeUndefined();
  });
});

it('limits timed boards to eligible results and measures series and clean distance per ride', async () => {
  expect(qualifies(arcade)).toBe(true);
  expect(qualifies({ ...arcade, minor: 1 })).toBe(false);
  const evidence = new RideEvidence(1, 2);
  const input = { x: 0, y: 1, brake: false, scheme: 'simple' } as const;
  const actions = { signal: null, lights: false, looking: false, bell: false };
  evidence.step(input, actions, false);
  const firstHash = await evidence.digest();
  evidence.road([{ kind: 'good' }, { kind: 'good' }], 22.5, false);
  expect(evidence.roadStats).toMatchObject({
    cleanMeters: 22,
    longestSeries: 2,
  });
  evidence.step(input, { ...actions, signal: 'left' }, false);
  expect(await evidence.digest()).not.toBe(firstHash);
  expect(await inputHash(new Uint8Array())).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
  evidence.road([{ kind: 'minor' }, { kind: 'good' }], 10, false);
  expect(evidence.roadStats).toMatchObject({
    cleanMeters: 0,
    longestSeries: 2,
  });
  const mission = {
    ...evidence.roadStats,
    kind: 'mission',
    city: 'warszawa',
    missionId: 'WAW-A1-01',
    points: 100,
  } as const;
  expect(qualifies(mission)).toBe(true);
  expect(qualifies({ ...mission, major: 1 })).toBe(false);
});
