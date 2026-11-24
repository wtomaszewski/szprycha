import { expect, it } from 'vitest';
import { campaignRoutes, stadiumShortcut } from './warsaw-campaign-routes';
import { missionContent, runMissionRoute } from './run-mission-route';
import { analyseMapCoverage } from '../../tools/map-coverage';
import { readMaps } from '../../tools/maps';

const demonstratedHabits = {
  'WAW-A2-02': ['ZNAK-S2'],
  'WAW-A2-03': ['MSC-02'],
  'WAW-A2-05': ['MSC-04'],
  'WAW-A3-02': ['GDZIE-10'],
  'WAW-A3-04': ['PP-01', 'PP-02', 'PP-03', 'PP-04'],
  'WAW-A3-05': ['MSC-05'],
} as Partial<Record<keyof typeof campaignRoutes, string[]>>;

it.each(Object.entries(campaignRoutes))(
  '%s completes its legal route',
  (id, route) => {
    const run = runMissionRoute(id, route);
    expect(
      run.mission.result,
      JSON.stringify({
        rider: run.rider,
        attempt: run.attempt,
        target: run.target,
        verdicts: run.verdicts,
      }),
    ).toMatchObject({ status: 'completed', illegalShortcut: false });
    const result = run.mission.result!;
    expect(result.verdicts.map(({ kind }) => kind)).not.toContain('major');
    expect(result.elapsedSeconds).toBeLessThanOrEqual(300);
    if (id !== 'WAW-A3-04')
      expect(result.elapsedSeconds).toBeGreaterThanOrEqual(120);
    expect(run.fired).toHaveLength(
      run.mission.definition.zdarzenia_wymuszone.length,
    );
    expect(run.collision).toBe(false);
    for (const ruleId of demonstratedHabits[
      id as keyof typeof campaignRoutes
    ] ?? [])
      expect(result.verdicts).toContainEqual(
        expect.objectContaining({ ruleId, kind: 'good' }),
      );
    if (id === 'WAW-A2-03')
      expect([...run.seenAgents]).toEqual(
        expect.arrayContaining(['tramwaj-aleja', 'pasazer-pod-palacem']),
      );
    if (id === 'WAW-A2-04') expect(result.smoothBonus).toBeGreaterThan(0);
    if (id === 'WAW-A2-06') expect(result.photos).toBe(1);
    if (id === 'WAW-A3-05')
      expect(run.seenAgents).toContain('pojazd-na-sygnale-praga');
    if (id === 'WAW-A3-06')
      expect(result.points).toBeGreaterThan(result.opponentScore!);
  },
);

const a = campaignRoutes;
const trafficErrors = [
  [
    'WAW-A2-01',
    [
      ...a['WAW-A2-01'].slice(0, 2),
      { x: 3359, y: 1808, crossingRed: 'pod-palacem-przejazd' },
      a['WAW-A2-01'][3]!,
    ],
    'SYG-02',
    'major',
  ],
  [
    'WAW-A2-02',
    [
      { x: 3424, y: 1680, until: 'arrow' },
      { ...a['WAW-A2-02'][0]!, until: undefined, wait: undefined, coast: true },
      ...a['WAW-A2-02'].slice(1, 4),
    ],
    'ZNAK-S2',
    'minor',
  ],
  [
    'WAW-A2-03',
    [
      a['WAW-A2-03'][0]!,
      { x: 3948, y: 1862, until: 'tram-stopped' },
      a['WAW-A2-03'][2]!,
    ],
    'MSC-02',
    'major',
  ],
  [
    'WAW-A3-01',
    [a['WAW-A3-01'][0]!, { x: 3310, y: 2770 }, { x: 3355, y: 2844 }],
    'GDZIE-09',
    'major',
  ],
  ['WAW-A3-03', [a['WAW-A3-03'][0]!, a['WAW-A3-03'][2]!], 'MSC-01', 'major'],
  [
    'WAW-A3-05',
    a['WAW-A3-05'].slice(0, 7).map((point) => ({ ...point, until: undefined })),
    'SYG-03',
    'major',
  ],
  [
    'WAW-A2-06',
    [...a['WAW-A2-06'].slice(0, 2), { x: 2914, y: 420 }, { x: 2914, y: 562 }],
    'ZNAK-B2T22',
    'major',
  ],
] as const;

it.each(trafficErrors)(
  '%s rejects the unsafe route',
  (id, route, ruleId, kind) => {
    const run = runMissionRoute(id, route, undefined, true);
    if (kind === 'major') {
      expect(run.mission.result).toMatchObject({
        status: 'failed',
        reason: 'major',
        points: 0,
        verdict: { ruleId, kind },
      });
    } else expect(run.mission.result).toBeUndefined();
    expect(run.verdicts).toContainEqual(
      expect.objectContaining({ ruleId, kind }),
    );
  },
);

it('ends a delivery that shakes the Professor’s parcel too much', () => {
  const run = runMissionRoute(
    'WAW-A2-04',
    a['WAW-A2-04'].map((point) => ({ ...point, maxInput: 1 })),
  );
  expect(run.mission.result).toMatchObject({
    status: 'failed',
    reason: 'wstrzasy_paczki',
    points: 0,
    smoothBonus: 0,
  });
  expect(run.mission.result?.verdicts).toContainEqual(
    expect.objectContaining({ ruleId: 'MAN-08', kind: 'minor' }),
  );
});

it('requires equipment before riding at dusk and detects riding without lights', () => {
  const id = 'WAW-A2-05';
  const blocked = runMissionRoute(
    id,
    a[id].map((point) => ({ ...point, lights: false })),
  );
  expect(blocked.mission.preparingBike).toBe(true);
  expect(blocked.mission.result).toBeUndefined();
  const ride = runMissionRoute(id, [
    { ...a[id][0]! },
    ...a[id].slice(1).map((point) => ({ ...point, lights: false })),
  ]);
  expect(ride.mission.result?.verdicts).toContainEqual(
    expect.objectContaining({ ruleId: 'MSC-04', kind: 'minor' }),
  );
});

it('keeps the bridge investigation open if the rider skips the photograph', () => {
  const id = 'WAW-A2-06';
  const run = runMissionRoute(
    id,
    a[id].map((point) => ({ ...point, photo: false })),
  );
  expect(run.target).toBe('most_detektyw_foto');
  expect(run.mission.result).toBeUndefined();
});

it.each([
  ['WAW-A3-02', 0, 0, 'GDZIE-10'],
  ['WAW-A3-04', 2, 0, 'PP-01'],
] as const)(
  '%s keeps a wrong answer open and counts the penalty on the completed route',
  (id, index, answer, ruleId) => {
    const route = a[id];
    const mistake = [...route.slice(0, index), { ...route[index]!, answer }];
    const blocked = runMissionRoute(id, mistake);
    expect(blocked.mission.pendingChoice?.regula).toBe(ruleId);
    expect(blocked.mission.result).toBeUndefined();
    const corrected = runMissionRoute(id, [...mistake, ...route.slice(index)]);
    expect(corrected.mission.result?.status).toBe('completed');
    expect(
      corrected.mission.result?.verdicts.filter(
        (entry) => entry.ruleId === ruleId,
      ),
    ).toEqual([expect.objectContaining({ kind: 'minor' })]);
  },
);

it('makes the illegal stadium shortcut faster, but costs time bonus and the race', () => {
  const id = 'WAW-A3-06';
  const legal = runMissionRoute(id, a[id]).mission.result!;
  const shortcut = runMissionRoute(id, stadiumShortcut).mission.result!;
  expect(shortcut.elapsedSeconds).toBeLessThan(legal.elapsedSeconds);
  expect(shortcut).toMatchObject({
    status: 'failed',
    reason: 'wynik_wyscigu',
    illegalShortcut: true,
    timeBonusEligible: false,
  });
  expect(shortcut.points).toBeLessThan(legal.points);
  expect(shortcut.verdicts).toContainEqual(
    expect.objectContaining({ ruleId: 'ZNAK-B1', kind: 'minor' }),
  );
});

it('removes the convoy time bonus for riding through the stadium ban', () => {
  const id = 'WAW-A3-05';
  const route = a[id];
  const legal = runMissionRoute(id, route).mission.result!;
  const shortcut = runMissionRoute(id, [
    ...route.slice(0, -3),
    { x: 1856, y: 2780 },
    { x: 1856, y: 3168 },
  ]).mission.result!;
  expect(shortcut).toMatchObject({
    status: 'completed',
    illegalShortcut: true,
    timeBonusEligible: false,
  });
  expect(shortcut.elapsedSeconds).toBeLessThan(legal.elapsedSeconds);
  expect(shortcut.points).toBeLessThan(legal.points);
});

it('exercises all seven modules on the Warsaw campaign map', async () => {
  const worlds = await readMaps(
    process.cwd(),
    missionContent.balans.silnik.kafel_m,
  );
  const missions = missionContent.misje.filter(
    ({ miasto, mapa }) => miasto === 'warszawa' && !mapa,
  );
  const campaign = analyseMapCoverage(
    worlds.get('warszawa'),
    missions,
    missionContent.przepisy.przepisy,
  );
  expect(
    campaign.modules
      .filter(({ missions }) => missions.length)
      .map(({ module }) => module),
  ).toEqual(['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07']);
});

it('defines every story order and unlocks each one from the preceding order', () => {
  const missions = missionContent.misje.filter(
    ({ miasto }) => miasto === 'warszawa',
  );
  expect(missions.map(({ id }) => id)).toEqual([
    'WAW-T-01',
    'WAW-T-02',
    ...Array.from({ length: 3 }, (_, act) =>
      Array.from(
        { length: 6 },
        (_, mission) => `WAW-A${act + 1}-0${mission + 1}`,
      ),
    ).flat(),
  ]);
  for (const [index, mission] of missions.entries())
    expect(mission.wymagania?.misje_ukonczone ?? []).toEqual(
      index ? [missions[index - 1]!.id] : [],
    );
});
