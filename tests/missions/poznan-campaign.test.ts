import { expect, it } from 'vitest';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { licenceRequirements } from '../../src/gameplay/exam/exam';
import { examRoute } from '../../src/gameplay/exam/route';
import { missionContent, runMissionRoute } from './run-mission-route';
import type { Waypoint } from './warsaw-routes';

const campaign = missionContent.misje.filter(
  ({ miasto }) => miasto === 'poznan',
);
const training = campaign.filter(({ akt }) => akt === 0);
const main = campaign.filter(({ akt }) => akt > 0);
const box = { x: 2272, y: 1136, mainGreen: 'aleja-W' };
const beyondLights = { x: 2660, y: 1136 };
const beforeAlley = { x: 1552, y: 2212, answer: 1, maxInput: 0.35 };

const routes: Record<string, Waypoint[]> = {
  'POZ-A1-01': [
    { x: 1510, y: 877, maxInput: 0.38 },
    { x: 1810, y: 877, maxInput: 0.38 },
    { x: 2030, y: 801, maxInput: 0.38 },
  ],
  'POZ-A1-02': [
    { x: 1596, y: 652, walking: true },
    { x: 1744, y: 652 },
    { x: 1888, y: 652 },
  ],
  'POZ-A2-01': [
    { x: 2530, y: 632, maxInput: 0.35, until: 'traffic-ended' },
    { x: 2530, y: 504, maxInput: 0.35 },
  ],
  'POZ-A2-02': [box, beyondLights],
  'POZ-A3-01': [
    { x: 1652, y: 1622, maxInput: 0.35 },
    { x: 1712, y: 1622, maxInput: 0.25, signal: 'right' },
    { x: 1712, y: 1848, maxInput: 0.35 },
    { x: 1712, y: 2080, answer: 1, maxInput: 0.35 },
    { x: 1712, y: 2080, answer: 0 },
  ],
  'POZ-A3-02': [
    beforeAlley,
    { x: 1552, y: 2400, walking: true },
    { x: 1552, y: 2430 },
  ],
};

it('reuses free-ride training and unlocks the three acts and licence route in order', async () => {
  const progress = new MissionProgress();
  await progress.selectCity('wroclaw');
  await progress.selectCity('poznan', true);
  expect(progress.freeRideCity).toBe('poznan');
  expect(progress.selectedCity).toBe('wroclaw');
  await progress.selectCity('poznan');
  expect(progress.selectedCity).toBe('poznan');
  expect(progress.nextMission('poznan', missionContent)?.id).toBe('POZ-B-01');
  expect(training.map(({ id }) => id)).toEqual([
    'POZ-B-01',
    'POZ-B-02',
    'POZ-B-03',
    'POZ-B-04',
  ]);
  expect(main.map(({ akt }) => akt)).toEqual([1, 1, 2, 2, 3, 3]);
  expect(progress.isAvailable(main[0]!, missionContent)).toBe(false);
  progress.store.change((profile) => {
    profile.completed = training.map(({ id }) => id).reverse();
  });
  for (const definition of main) {
    expect(
      licenceRequirements(progress.store.profile, missionContent).cities,
    ).toEqual([]);
    expect(progress.nextMission('poznan', missionContent)?.id).toBe(
      definition.id,
    );
    progress.complete(definition);
  }
  expect(progress.nextMission('poznan', missionContent)).toBeUndefined();
  expect(
    licenceRequirements(progress.store.profile, missionContent).cities,
  ).toEqual(['poznan']);
});

it('practises M01–M07 in the main missions', () => {
  const ruleIds = new Set(
    main.flatMap(({ reguly_cwiczone }) => reguly_cwiczone),
  );
  const modules = new Set(
    missionContent.przepisy.przepisy
      .filter(({ id }) => ruleIds.has(id))
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
  'completes %s without violations or collisions',
  (id, points) => {
    const { mission, collision, rider, target, fired } = runMissionRoute(
      id,
      points,
    );
    expect(
      mission.result,
      JSON.stringify({ target, rider, fired, result: mission.result }),
    ).toMatchObject({ status: 'completed' });
    expect(
      mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
    ).toEqual([]);
    expect(collision).toBe(false);
    expect(fired).toEqual(
      mission.definition.zdarzenia_wymuszone.map(({ typ }) => typ),
    );
    if (id === 'POZ-A2-01')
      expect(mission.result?.verdicts).toContainEqual(
        expect.objectContaining({
          ruleId: 'PIER-10',
          kind: 'good',
          evidence: expect.not.objectContaining({ answer: expect.anything() }),
        }),
      );
    if (id === 'POZ-A3-01')
      expect(mission.result?.verdicts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ ruleId: 'MSC-04', kind: 'good' }),
          expect.objectContaining({ ruleId: 'PP-01', kind: 'good' }),
          expect.objectContaining({ ruleId: 'PP-03', kind: 'good' }),
        ]),
      );
  },
);

it('allows a legal licence ride through the bicycle box', () => {
  const { mission } = runMissionRoute(
    examRoute('poznan', missionContent.balans.licencja),
    [box, beyondLights],
  );
  expect(mission.result).toMatchObject({ status: 'completed' });
  expect(
    mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
  ).toEqual([]);
});

it.each([
  [
    'POZ-A1-01',
    'ZNAK-B1',
    [
      { x: 1510, y: 877, maxInput: 0.38 },
      { x: 1580, y: 783, maxInput: 0.35 },
      { x: 1680, y: 783, maxInput: 0.35 },
    ],
  ],
  [
    'POZ-A3-02',
    'GDZIE-09',
    [beforeAlley, { x: 1552, y: 2400, maxInput: 0.35 }],
  ],
] satisfies [string, string, Waypoint[]][])(
  'denies mission credit and time bonus for a forbidden shortcut in %s',
  (id, ruleId, points) => {
    const { mission } = runMissionRoute(id, points);
    expect(mission.result).toMatchObject({
      status: 'failed',
      timeBonus: 0,
      points: 0,
      stars: 0,
      verdict: { ruleId },
    });
  },
);
