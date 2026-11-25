import { expect, it } from 'vitest';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { licenceRequirements } from '../../src/gameplay/exam/exam';
import { examRoute } from '../../src/gameplay/exam/route';
import { missionContent, runMissionRoute } from './run-mission-route';
import type { Waypoint } from './warsaw-routes';

const missions = missionContent.misje.filter(
  ({ miasto }) => miasto === 'zakopane',
);
const training = missions.filter(({ akt }) => akt === 0);
const main = missions.filter(({ akt }) => akt > 0);
const krupowki = { x: 1528, y: 854, maxInput: 0.45 };
const lights = { x: 2784, y: 1000, maxInput: 0.45 };
const beyondLights = { x: 2784, y: 1504, maxInput: 0.5 };
const descentStop = { x: 3968, y: 1778, maxInput: 0.4, answer: 1 };
const descentEnd = { x: 3968, y: 2160, maxInput: 0.4 };
const bridge = { x: 1616, y: 2000, maxInput: 0.4 };
const beforeBan = { x: 1584, y: 2108, maxInput: 0.35 };
const aid = { x: 1584, y: 2376, walking: true };
const beforeTracks = { x: 1104, y: 3190, answer: 0 };
const beyondTracks = { x: 1104, y: 2736, maxInput: 0.5 };

const routes: Record<string, Waypoint[]> = {
  'ZAK-A1-01': [krupowki, { x: 2072, y: 856, maxInput: 0.45 }],
  'ZAK-A1-02': [
    { x: 1555, y: 863, walking: true },
    { x: 1740, y: 863 },
    { x: 2050, y: 863 },
  ],
  'ZAK-A2-01': [
    { ...lights, answer: 0 },
    { ...lights, crossingGreen: 'dworzec-przejazd' },
    beyondLights,
  ],
  'ZAK-A2-02': [descentStop, descentEnd],
  'ZAK-A3-01': [
    bridge,
    beforeBan,
    { ...aid, answer: 1 },
    { ...aid, answer: 0 },
    { ...aid, answer: 1 },
  ],
  'ZAK-A3-02': [
    beforeTracks,
    { x: 1104, y: 3174, railOpen: 'kolej-przejazd' },
    beyondTracks,
  ],
};

it('reuses free-ride training saves and unlocks each act and the exam in order', async () => {
  const progress = new MissionProgress();
  await progress.selectCity('wroclaw');
  await progress.selectCity('zakopane', true);
  expect(progress.freeRideCity).toBe('zakopane');
  expect(progress.selectedCity).toBe('wroclaw');
  await progress.selectCity('zakopane');
  expect(progress.selectedCity).toBe('zakopane');
  expect(progress.nextMission('zakopane', missionContent)?.id).toBe('ZAK-B-01');
  expect(training.map(({ id }) => id)).toEqual([
    'ZAK-B-01',
    'ZAK-B-02',
    'ZAK-B-03',
    'ZAK-B-04',
    'ZAK-B-05',
  ]);
  expect(main.map(({ akt }) => akt)).toEqual([1, 1, 2, 2, 3, 3]);
  expect(progress.isAvailable(main[0]!, missionContent)).toBe(false);
  progress.store.change((profile) => {
    profile.completed = training.map(({ id }) => id);
  });
  for (const mission of main) {
    expect(
      licenceRequirements(progress.store.profile, missionContent).cities,
    ).toEqual([]);
    expect(progress.nextMission('zakopane', missionContent)?.id).toBe(
      mission.id,
    );
    progress.complete(mission);
  }
  expect(progress.nextMission('zakopane', missionContent)).toBeUndefined();
  expect(
    licenceRequirements(progress.store.profile, missionContent).cities,
  ).toEqual(['zakopane']);
});

it('covers M01–M07 in the main missions', () => {
  const ids = new Set(main.flatMap(({ reguly_cwiczone }) => reguly_cwiczone));
  const modules = new Set(
    missionContent.przepisy.przepisy
      .filter(({ id }) => ids.has(id))
      .map(({ modul }) => modul),
  );
  expect([...modules].sort()).toEqual([
    'M01',
    'M02',
    'M03',
    'M04',
    'M05',
    'M06',
    'M07',
  ]);
});

it.each(Object.entries(routes))(
  'completes %s safely with no time bonus',
  (id, route) => {
    const { mission, collision, rider, target, fired } = runMissionRoute(
      id,
      route,
    );
    expect(
      mission.result,
      JSON.stringify({ target, rider, fired, result: mission.result }),
    ).toMatchObject({
      status: 'completed',
      timeBonus: 0,
      timeBonusEnabled: false,
    });
    expect(
      mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
    ).toEqual([]);
    expect(collision).toBe(false);
    expect(fired).toEqual(
      mission.definition.zdarzenia_wymuszone.map(({ typ }) => typ),
    );
    if (id === 'ZAK-A3-01')
      expect(mission.result?.verdicts).toEqual(
        expect.arrayContaining(
          ['MSC-04', 'PP-01', 'PP-03', 'PP-02'].map((ruleId) =>
            expect.objectContaining({ ruleId, kind: 'good' }),
          ),
        ),
      );
  },
);

it('awards the same result on the foggy descent past the reference time', () => {
  const slower = runMissionRoute('ZAK-A2-02', [
    { ...descentStop, maxInput: 0.28, wait: 125 },
    { ...descentEnd, maxInput: 0.28 },
  ]).mission.result!;
  const faster = runMissionRoute('ZAK-A2-02', routes['ZAK-A2-02']!).mission
    .result!;
  expect(slower.status).toBe('completed');
  expect(faster.status).toBe('completed');
  const reference = main.find(({ id }) => id === 'ZAK-A2-02')!.par_s;
  expect(slower.elapsedSeconds).toBeGreaterThan(reference);
  expect(faster.elapsedSeconds).toBeLessThan(reference);
  expect(slower.stars).toBe(3);
  expect(slower.points).toBe(faster.points);
  expect(slower.stars).toBe(faster.stars);
});

it.each([
  ['ZAK-A1-01', 'ZNAK-B1', [krupowki, { x: 1528, y: 750 }]],
  [
    'ZAK-A2-01',
    'SYG-02',
    [
      { ...lights, answer: 0 },
      { ...lights, crossingRed: 'dworzec-przejazd' },
      beyondLights,
    ],
  ],
  ['ZAK-A2-02', 'MAN-08', [{ x: 3968, y: 1778 }]],
  ['ZAK-A3-01', 'GDZIE-09', [bridge, beforeBan, { x: 1584, y: 2200 }]],
  ['ZAK-A3-02', 'MSC-01', [{ ...beforeTracks, wait: 22 }, beyondTracks]],
] satisfies [string, string, Waypoint[]][])(
  'denies completion and points in %s after %s',
  (id, ruleId, route) => {
    const { mission } = runMissionRoute(id, route);
    expect(mission.result).toMatchObject({
      status: 'failed',
      timeBonus: 0,
      points: 0,
      stars: 0,
      verdict: { ruleId },
    });
  },
);

it('accepts a legal exam ride through the bicycle signals', () => {
  const { mission } = runMissionRoute(
    examRoute('zakopane', missionContent.balans.licencja),
    [{ ...lights, crossingGreen: 'dworzec-przejazd' }, beyondLights],
  );
  expect(mission.result).toMatchObject({ status: 'completed' });
  expect(
    mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
  ).toEqual([]);
});
