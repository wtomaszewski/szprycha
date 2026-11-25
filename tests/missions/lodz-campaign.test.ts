import { expect, it } from 'vitest';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { licenceRequirements } from '../../src/gameplay/exam/exam';
import { examRoute } from '../../src/gameplay/exam/route';
import { missionContent, runMissionRoute } from './run-mission-route';
import type { Waypoint } from './warsaw-routes';

const campaign = missionContent.misje.filter(({ miasto }) => miasto === 'lodz');
const training = campaign.filter(({ akt }) => akt === 0);
const main = campaign.filter(({ akt }) => akt > 0);
const beforeCrossing = { x: 2784, y: 994, maxInput: 0.35 };
const afterCrossing = { x: 2784, y: 1180, maxInput: 0.65 };

const routes: Record<string, Waypoint[]> = {
  'LOD-A1-01': [
    { x: 1490, y: 861, maxInput: 0.35 },
    { x: 1720, y: 861, maxInput: 0.35 },
    { x: 2090, y: 861, maxInput: 0.35 },
  ],
  'LOD-A1-02': [
    { x: 2020, y: 861, walking: true },
    { x: 1860, y: 861 },
    { x: 1538, y: 861 },
  ],
  'LOD-A1-03': [
    { x: 1478, y: 742, maxInput: 0.35 },
    { x: 1710, y: 742, maxInput: 0.35 },
    { x: 2050, y: 742, maxInput: 0.35 },
  ],
  'LOD-A2-01': [
    { x: 3120, y: 952, maxInput: 0.35 },
    { x: 3120, y: 832, maxInput: 0.35 },
    { x: 3120, y: 716, maxInput: 0.35 },
  ],
  'LOD-A2-02': [
    { x: 3268, y: 1228, until: 'traffic-ended', maxInput: 0.28 },
    { x: 3268, y: 1112, maxInput: 0.32 },
  ],
  'LOD-A3-01': [
    { x: 3410, y: 1310, answer: 1, maxInput: 0.35 },
    { x: 3410, y: 1310, answer: 0 },
    { x: 3410, y: 1310, answer: 1 },
  ],
  'LOD-A3-02': [
    { ...beforeCrossing, crossingGreen: 'aleja-przejazd' },
    afterCrossing,
    { x: 2784, y: 1248, maxInput: 0.35 },
  ],
};

it('reuses free-ride training and opens the acts and licence route in order', async () => {
  const progress = new MissionProgress();
  await progress.selectCity('wroclaw');
  await progress.selectCity('lodz', true);
  expect(progress.freeRideCity).toBe('lodz');
  expect(progress.selectedCity).toBe('wroclaw');
  await progress.selectCity('lodz');
  expect(progress.selectedCity).toBe('lodz');
  expect(progress.nextMission('lodz', missionContent)?.id).toBe('LOD-B-01');
  expect(main.map(({ akt }) => akt)).toEqual([1, 1, 1, 2, 2, 3, 3]);
  expect(progress.isAvailable(main[0]!, missionContent)).toBe(false);
  for (const mission of training) {
    expect(progress.isAvailable(main[0]!, missionContent)).toBe(false);
    progress.complete(mission);
  }
  for (const mission of main) {
    expect(progress.nextMission('lodz', missionContent)?.id).toBe(mission.id);
    expect(
      licenceRequirements(progress.store.profile, missionContent).cities,
    ).toEqual([]);
    progress.complete(mission);
  }
  expect(progress.nextMission('lodz', missionContent)).toBeUndefined();
  expect(
    licenceRequirements(progress.store.profile, missionContent).cities,
  ).toEqual(['lodz']);
});

it('covers M01–M07 in the main missions independently of the training', () => {
  const rules = new Set(main.flatMap(({ reguly_cwiczone }) => reguly_cwiczone));
  const modules = new Set(
    missionContent.przepisy.przepisy
      .filter(({ id }) => rules.has(id))
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

it('has a tested route for every main mission', () => {
  expect(Object.keys(routes)).toEqual(main.map(({ id }) => id));
});

it.each(Object.entries(routes))(
  'completes %s cleanly and triggers its teaching event',
  (id, points) => {
    const { mission, collision, rider, target, fired, attempt } =
      runMissionRoute(id, points);
    expect(
      mission.result,
      JSON.stringify({ target, rider, fired, attempt }),
    ).toMatchObject({
      status: 'completed',
    });
    expect(collision).toBe(false);
    expect(
      mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
    ).toEqual([]);
    expect(fired).toEqual(
      mission.definition.zdarzenia_wymuszone.map(({ typ }) => typ),
    );
    if (id === 'LOD-A1-03')
      expect(
        new Set(
          mission.result?.verdicts.flatMap(({ ruleId, highlight }) =>
            ruleId === 'MAN-14' && highlight?.agentId
              ? [highlight.agentId]
              : [],
          ),
        ),
      ).toEqual(new Set(['rower-cargo', 'riksza']));
    if (id === 'LOD-A2-02')
      expect(mission.result?.verdicts).toContainEqual(
        expect.objectContaining({ ruleId: 'MSC-03', kind: 'good' }),
      );
    if (id === 'LOD-A3-01')
      expect(mission.result?.verdicts.map(({ ruleId }) => ruleId)).toEqual(
        expect.arrayContaining(['PP-01', 'PP-03', 'PP-02']),
      );
  },
);

it.each([
  [
    'LOD-A1-01',
    'ZNAK-B1',
    [
      { x: 1490, y: 861, maxInput: 0.35 },
      { x: 1578, y: 799, maxInput: 0.32 },
      { x: 1712, y: 799, maxInput: 0.32 },
    ],
  ],
  [
    'LOD-A2-01',
    'GDZIE-02',
    [
      { x: 3120, y: 952, maxInput: 0.35 },
      { x: 3064, y: 856, maxInput: 0.3 },
      { x: 3064, y: 716, maxInput: 0.3 },
    ],
  ],
  [
    'LOD-A3-02',
    'SYG-02',
    [{ ...beforeCrossing, crossingRed: 'aleja-przejazd' }, afterCrossing],
  ],
] satisfies [string, string, Waypoint[]][])(
  'awards no mission credit for %s on the forbidden route (%s)',
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

it('allows a clean licence ride across the avenue', () => {
  const { mission, collision } = runMissionRoute(
    examRoute('lodz', missionContent.balans.licencja),
    routes['LOD-A3-02']!.slice(0, 2),
  );
  expect(collision).toBe(false);
  expect(mission.result).toMatchObject({ status: 'completed' });
  expect(
    mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
  ).toEqual([]);
});
