import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { nicknameAt, migrateNickname } from '../../src/content/nicknames.ts';
import type { RankingScore } from '../../src/content/rankings.ts';
import { buildRankingRules } from '../../tools/ranking-rules.ts';
import { createRankingServer } from '../src/http.ts';
import type { RankingRules } from '../src/rules.ts';
import { RankingStore } from '../src/store.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const id = (n: number) =>
  `9bdc4111-a502-4aaf-b77d-${String(n).padStart(12, '0')}`;
const hash = (n: number) =>
  createHash('sha256').update(String(n)).digest('hex');
const fixed = '2026-03-28T17:00:00Z';
const origin = 'https://gra.example';
const season = { anchor: '2026-03-30', weeks: 2 };
let rules: RankingRules;
const close: (() => Promise<void>)[] = [];

beforeAll(async () => {
  rules = await buildRankingRules(root);
});
afterEach(async () => {
  for (const dispose of close.splice(0).reverse()) await dispose();
});

async function fixture({
  file = ':memory:',
  initial = fixed,
  limit = 240,
  catalog = rules,
} = {}) {
  let now = new Date(initial);
  const store = new RankingStore(file);
  const server = createRankingServer({
    store,
    rules: catalog,
    season,
    now: () => now,
    origins: [origin],
    requestsPerMinute: limit,
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  let open = true;
  const stop = async () => {
    if (!open) return;
    open = false;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    store.close();
  };
  close.push(stop);
  const address = server.address();
  if (typeof address !== 'object' || !address)
    throw new Error('No server address');
  const base = `http://127.0.0.1:${address.port}/v1`;
  const request = (path: string, options?: RequestInit) =>
    fetch(base + path, options);
  const submit = (
    score: RankingScore | object,
    player = 1,
    nickname = nicknameAt(player),
  ) =>
    request('/scores', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + id(player),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nickname, avatarId: 'gold', score }),
    });
  const get = async (path: string, player?: number) => {
    const response = await request(
      path,
      player === undefined
        ? {}
        : { headers: { Authorization: 'Bearer ' + id(player) } },
    );
    expect(response.status).toBe(200);
    return response.json();
  };
  return {
    setClock: (time: string) => {
      now = new Date(time);
    },
    submit,
    get,
    request,
    stop,
  };
}

function mission(): Extract<RankingScore, { kind: 'mission' }> {
  const entry = rules.missions['WAW-A1-01']!;
  return {
    kind: 'mission',
    city: 'warszawa',
    missionId: 'WAW-A1-01',
    seed: 42,
    inputHash: hash(1),
    version: entry.version,
    ticks: entry.minTicks + 240,
    good: 2,
    minor: 0,
    major: 0,
    longestSeries: 2,
    cleanMeters: 100,
    points: 1600,
    speedPercent: 100,
  };
}

const plac = (ticks = rules.plac.minTicks, proof = 101): RankingScore => ({
  kind: 'plac',
  ticks,
  speedPercent: 100,
  minor: 0,
  major: 0,
  seed: 7,
  inputHash: hash(proof),
  version: rules.plac.version,
});
const xp = (amount: number, week = '2026-03-23'): RankingScore => ({
  kind: 'weekly-xp',
  week,
  xp: amount,
  seed: 10,
  inputHash: hash(99),
  version: rules.weeklyXp.version,
});

it('stores a single best result per player and returns the top 50 and own placement', async () => {
  const server = await fixture();
  const score = mission();
  const players = Array.from({ length: 52 }, (_, n) => n + 1);
  const responses = await Promise.all(
    players.map((player) =>
      server.submit({ ...score, points: 1652 - player }, player),
    ),
  );
  expect(responses.every(({ status }) => status === 201)).toBe(true);
  expect((await server.submit(score, 52)).status).toBe(200);
  expect(
    (await server.submit({ ...score, inputHash: hash(2), points: 1599 }, 52))
      .status,
  ).toBe(201);

  const path = '/rankings?board=mission&city=warszawa&missionId=WAW-A1-01';
  const board = await server.get(path, 52);
  expect(board.top).toHaveLength(50);
  expect(board.top[0]).toEqual({
    position: 1,
    nickname: nicknameAt(1),
    avatarId: 'gold',
    value: 1651,
  });
  expect(board.self).toEqual({
    position: 52,
    nickname: nicknameAt(52),
    avatarId: 'gold',
    value: 1600,
  });
  expect((await server.get(path)).self).toBeNull();
  expect(JSON.stringify(board)).not.toContain(id(52));
  expect(
    (
      await server.request(
        '/rankings?board=mission&city=wroclaw&missionId=WAW-A1-01',
      )
    ).status,
  ).toBe(404);
});

it('rejects unknown fields, invented nicknames, inconsistent versions and impossible or unclean rides', async () => {
  const server = await fixture();
  const score = mission();
  expect(rules.missions[score.missionId]!.minTicks).toBeGreaterThan(60);
  expect(rules.plac.minTicks).toBeGreaterThan(60);
  expect((await server.submit(score, 1, 'Szybki Jeż 101')).status).toBe(400);
  expect((await server.submit(score, 1, 'Dzielny Jeż 12')).status).toBe(400);
  expect((await server.submit(score, 1, migrateNickname(299))).status).toBe(
    201,
  );

  for (const bad of [
    { ...score, email: 'name@example.test' },
    { ...score, inputHash: 'plaintext' },
    { ...score, seed: 2 ** 32 },
    { ...score, speedPercent: 75 },
  ])
    expect((await server.submit(bad)).status).toBe(400);

  for (const bad of [
    { ...score, ticks: rules.missions[score.missionId]!.minTicks - 1 },
    { ...score, city: 'wroclaw' },
    { ...score, missionId: 'WAW-A1-99' },
    { ...score, version: hash(7) },
    { ...score, major: 1, cleanMeters: 0 },
    { ...score, minor: 1, cleanMeters: 10 },
    { ...score, cleanMeters: 1000 },
    { ...score, longestSeries: score.good + 1 },
    { ...score, points: 10_000 },
    { ...score, points: -10_000 },
    { ...plac(), major: 1 },
    { ...plac(), minor: 1 },
    { ...plac(), ticks: rules.plac.minTicks - 1 },
    { ...plac(), version: hash(8) },
    { ...xp(500), version: hash(9) },
  ])
    expect((await server.submit(bad)).status).toBe(422);

  expect(
    (
      await server.submit({
        ...score,
        minor: 1,
        cleanMeters: 0,
        inputHash: hash(23),
        points: 1450,
      })
    ).status,
  ).toBe(201);
  expect((await server.get('/rankings?board=cities', 1)).self).toEqual([
    { city: 'warszawa', position: 1, value: 100, contributedMeters: 100 },
  ]);
});

it('ranks clean plac times and safety streaks and sums clean distances once', async () => {
  const server = await fixture();
  expect((await server.submit(mission())).status).toBe(201);
  expect((await server.submit(mission())).status).toBe(200);
  const freeRide: RankingScore = {
    kind: 'ride',
    city: 'wroclaw',
    speedPercent: 100,
    version: rules.ride.wroclaw.version,
    seed: 42,
    inputHash: hash(3),
    ticks: 2400,
    good: 7,
    minor: 0,
    major: 0,
    longestSeries: 7,
    cleanMeters: 140,
  };
  expect((await server.submit(freeRide, 2)).status).toBe(201);

  const { minTicks } = rules.plac;
  expect((await server.submit(plac(minTicks + 5), 1)).status).toBe(201);
  expect((await server.submit(plac(minTicks + 3, 102), 1)).status).toBe(201);
  expect((await server.submit(plac(minTicks + 1), 2)).status).toBe(201);
  expect((await server.get('/rankings?board=plac', 1)).self).toMatchObject({
    position: 2,
    value: minTicks + 3,
  });
  expect((await server.get('/rankings?board=safety', 2)).self).toMatchObject({
    position: 1,
    value: 7,
  });
  expect(await server.get('/rankings?board=cities', 2)).toMatchObject({
    top: [
      { city: 'wroclaw', position: 1, value: 140 },
      { city: 'warszawa', position: 2, value: 100 },
    ],
    self: [
      { city: 'wroclaw', position: 1, value: 140, contributedMeters: 140 },
    ],
  });
});

it('promotes the top 20% of each league once and resets XP at Warsaw Monday across DST', async () => {
  const server = await fixture();
  for (let player = 1; player <= 5; player++)
    expect((await server.submit(xp(100 - player), player)).status).toBe(201);
  expect((await server.submit(xp(99), 1)).status).toBe(200);
  expect((await server.submit(xp(50), 1)).status).toBe(200);
  expect((await server.submit(xp(101.5), 1)).status).toBe(201);
  server.setClock('2026-03-29T21:59:59.999Z');
  expect(await server.get('/leagues', 1)).toMatchObject({
    week: '2026-03-23',
    league: 'bronze',
  });
  expect(
    (await server.get('/rankings?board=weekly-xp&league=bronze', 1)).self,
  ).toMatchObject({ position: 1, value: 101.5 });
  server.setClock('2026-03-29T22:00:00Z');
  expect(await server.get('/leagues', 1)).toMatchObject({
    week: '2026-03-30',
    league: 'silver',
  });
  expect((await server.get('/leagues', 2)).league).toBe('bronze');
  expect(
    (await server.get('/rankings?board=weekly-xp&league=silver', 1)).top,
  ).toEqual([]);
  expect((await server.submit(xp(400), 1)).status).toBe(409);
  expect((await server.submit(xp(200, '2026-03-30'), 1)).status).toBe(201);
  expect((await server.submit(xp(100, '2026-03-30'), 2)).status).toBe(201);
  server.setClock('2026-04-05T22:00:00Z');
  expect((await server.get('/leagues', 1)).league).toBe('gold');
  expect((await server.get('/leagues', 2)).league).toBe('silver');
  server.setClock('2026-04-26T22:00:00Z');
  expect((await server.get('/leagues', 2)).league).toBe('silver');
});

it('resets seasonal results independently and applies the current plac version', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'ranking-rules-'));
  close.push(() => rm(folder, { recursive: true, force: true }));
  const file = join(folder, 'scores.sqlite');
  const server = await fixture({ file, initial: '2026-04-01T13:00:00Z' });
  expect((await server.submit(mission())).status).toBe(201);
  expect((await server.submit(plac())).status).toBe(201);
  server.setClock('2026-04-05T22:00:00Z');
  expect((await server.get('/rankings?board=cities', 1)).self).toEqual([]);
  expect((await server.get('/rankings?board=safety', 1)).self.value).toBe(2);
  expect((await server.get('/rankings?board=plac', 1)).top).toHaveLength(1);

  await server.stop();
  const updated = await fixture({
    file,
    initial: '2026-04-12T21:59:59.999Z',
    catalog: { ...rules, plac: { ...rules.plac, version: hash(102) } },
  });
  expect((await updated.get('/rankings?board=plac', 1)).top).toEqual([]);
  expect((await updated.get('/rankings?board=safety', 1)).top).toHaveLength(1);
  updated.setClock('2026-04-12T22:00:00Z');
  for (const query of [
    'board=safety',
    'board=plac',
    'board=mission&city=warszawa&missionId=WAW-A1-01',
  ])
    expect(await updated.get('/rankings?' + query, 1)).toMatchObject({
      top: [],
      self: null,
      season: { start: '2026-04-13', end: '2026-04-27' },
    });
});

it('deletes profile data, contributions and metadata in one request without storing addresses', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'ranking-data-'));
  close.push(() => rm(folder, { recursive: true, force: true }));
  const log = vi.spyOn(console, 'error');
  try {
    const file = join(folder, 'scores.sqlite');
    const server = await fixture({ file });
    await server.submit(mission());
    await server.submit(plac());
    await server.submit(xp(50));
    const forwarded = '203.0.113.108';
    await server.request('/rankings?board=safety', {
      headers: { 'X-Forwarded-For': forwarded },
    });
    const inspect = async () =>
      Buffer.concat(
        await Promise.all(
          (await readdir(folder)).map((entry) => readFile(join(folder, entry))),
        ),
      ).toString();
    const before = await inspect();
    expect(before).toContain(id(1));
    expect(before).not.toContain(forwarded);
    expect(before).not.toContain('127.0.0.1');
    expect(before).not.toContain(mission().inputHash);
    expect(
      (await server.request('/profile', { method: 'DELETE' })).status,
    ).toBe(401);
    const options = {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + id(1) },
    };
    expect((await server.request('/profile', options)).status).toBe(204);
    expect((await server.request('/profile', options)).status).toBe(204);
    expect((await server.get('/leagues', 1)).league).toBeNull();
    expect(
      (await server.get('/rankings?board=weekly-xp&league=bronze')).top,
    ).toEqual([]);
    expect((await server.get('/rankings?board=plac')).top).toEqual([]);
    expect(
      (await server.get('/rankings?board=cities')).top.every(
        (city: { value: number }) => city.value === 0,
      ),
    ).toBe(true);
    await server.stop();
    const db = new DatabaseSync(file, { readOnly: true });
    for (const table of ['profiles', 'runs', 'weekly_xp'])
      expect(
        db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count,
      ).toBe(0);
    db.close();
    expect(await inspect()).not.toContain(id(1));
    expect(log).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});

it('enforces exact CORS origins, a body limit and rate limits', async () => {
  const server = await fixture({ limit: 4 });
  expect(await server.get('/health')).toEqual({ status: 'ok' });
  const preflight = await server.request('/scores', {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, content-type',
    },
  });
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  expect(preflight.headers.get('Access-Control-Allow-Credentials')).toBeNull();
  const denied = await server.request('/rankings?board=safety', {
    headers: { Origin: origin + '.other.test' },
  });
  expect(denied.status).toBe(403);
  expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  expect(
    (await server.request('/rankings?board=safety&board=safety')).status,
  ).toBe(400);
  expect(
    (
      await server.request('/scores', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + id(1),
          'Content-Type': 'application/json',
        },
        body: ' '.repeat(4097),
      })
    ).status,
  ).toBe(413);
  expect((await server.request('/rules')).status).toBe(200);
  expect((await server.request('/rules')).status).toBe(200);
  const throttled = await server.request('/rules', {
    headers: { 'X-Forwarded-For': '203.0.113.45' },
  });
  expect(throttled.status).toBe(429);
  expect(Number(throttled.headers.get('Retry-After'))).toBeGreaterThan(0);
});
