import { expect, it } from 'vitest';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { licenceRequirements } from '../../src/gameplay/exam/exam';
import { examRoute } from '../../src/gameplay/exam/route';
import { missionContent, runMissionRoute } from './run-mission-route';
import type { Waypoint } from './warsaw-routes';

const campaign = missionContent.misje.filter(
  ({ miasto }) => miasto === 'krakow',
);
const kopiec: Waypoint[] = [
  { x: 2650, y: 2852, maxInput: 0.35 },
  { x: 3320, y: 2852 },
  { x: 3338, y: 2896 },
];
const kazimierz: Waypoint[] = [
  { x: 3152, y: 1395, maxInput: 0.42 },
  { x: 3152, y: 1180, maxInput: 0.42, signal: 'left' },
  { x: 2784, y: 1180, maxInput: 0.42 },
  { x: 2784, y: 1162, maxInput: 0.42, crossingGreen: 'aleja-przejazd' },
  { x: 2784, y: 900 },
];
const routes: Record<string, Waypoint[]> = {
  'KRA-A1-01': [
    { x: 1440, y: 769, maxInput: 0.42 },
    { x: 2050, y: 769, maxInput: 0.42 },
    { x: 2050, y: 816, maxInput: 0.42 },
  ],
  'KRA-A1-02': [
    { x: 1440, y: 635, walking: true },
    { x: 1490, y: 635 },
    { x: 1760, y: 635 },
    { x: 1990, y: 635 },
  ],
  'KRA-A1-03': [
    { x: 1720, y: 1668, maxInput: 0.32 },
    { x: 2064, y: 1668, maxInput: 0.32 },
  ],
  'KRA-A1-04': [
    { x: 1552, y: 732, maxInput: 0.42, photo: true },
    { x: 1552, y: 775, maxInput: 0.42 },
    { x: 1688, y: 934, walking: true, photo: true },
  ],
  'KRA-A1-05': [
    { x: 1432, y: 896, walking: true },
    { x: 1432, y: 990, until: 'traffic-ended' },
    { x: 1432, y: 1185 },
    { x: 1728, y: 1185 },
    { x: 1728, y: 1252 },
  ],
  'KRA-A2-01': kazimierz,
  'KRA-A2-02': [
    { x: 3187, y: 1480, maxInput: 0.42 },
    { x: 3620, y: 1480, maxInput: 0.42 },
    { x: 3620, y: 1504, maxInput: 0.42 },
  ],
  'KRA-A2-03': [
    { x: 2528, y: 1180, mainGreen: 'aleja-S' },
    { x: 2528, y: 968 },
    { x: 2528, y: 856, until: 'tram-stopped' },
    { x: 2528, y: 856, until: 'tram-cleared' },
    { x: 2528, y: 530 },
  ],
  'KRA-A2-04': [
    { x: 3150, y: 2144 },
    { x: 3805, y: 2144 },
  ],
  'KRA-A2-05': [
    { x: 3708, y: 1136, answer: 0 },
    { x: 3767, y: 1136, photo: true },
  ],
  'KRA-A3-01': [
    { x: 1104, y: 3190, railOpen: 'debnik-kolej' },
    { x: 1104, y: 3054 },
    { x: 1104, y: 2800 },
  ],
  'KRA-A3-02': [
    { x: 2930, y: 2238, maxInput: 0.32, answer: 0 },
    { x: 2930, y: 2238, answer: 1 },
    { x: 2930, y: 2238, answer: 0 },
    { x: 3244, y: 2238, maxInput: 0.32 },
  ],
  'KRA-A3-03': kopiec,
  'KRA-A3-04': [
    { x: 1056, y: 1188 },
    { x: 1056, y: 1176, wait: 1 },
    { x: 1056, y: 888, maxInput: 0.42 },
  ],
  'KRA-A3-05': kopiec,
};

it('unlocks one Kraków mission at a time through training and all three acts', () => {
  const progress = new MissionProgress();
  expect(campaign.map(({ akt }) => akt)).toEqual([
    0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3,
  ]);
  expect(campaign.filter(({ akt }) => akt > 0).map(({ id }) => id)).toEqual(
    Object.keys(routes),
  );
  for (const definition of campaign) {
    expect(definition.poboczna).toBeUndefined();
    expect(definition.dialog_start).toBeDefined();
    expect(definition.dialog_koniec).toBeDefined();
    expect(definition.zdarzenia_wymuszone).not.toHaveLength(0);
    expect(progress.nextMission('krakow', missionContent)?.id).toBe(
      definition.id,
    );
    progress.complete(definition);
  }
  expect(progress.nextMission('krakow', missionContent)).toBeUndefined();
  expect(
    licenceRequirements(progress.store.profile, missionContent).cities,
  ).toEqual(['krakow']);
});

it.each(Object.entries(routes))(
  'completes %s on a legal route and meets its advertised practices',
  (id, route) => {
    const { mission, fired, target, rider, verdicts, seenAgents } =
      runMissionRoute(id, route);
    const violations = (mission.result?.verdicts ?? verdicts).filter(
      ({ kind }) => kind !== 'good',
    );
    expect(
      violations,
      JSON.stringify({ target, x: rider.x, y: rider.y }),
    ).toEqual([]);
    expect(
      mission.result,
      JSON.stringify({ target, x: rider.x, y: rider.y }),
    ).toMatchObject({ status: 'completed', stars: 3, illegalShortcut: false });
    expect(fired).toEqual(
      mission.definition.zdarzenia_wymuszone.map(({ typ }) => typ),
    );
    if (id === 'KRA-A1-05') expect(seenAgents).toContain('pieszy-targ');
    if (id === 'KRA-A2-03') {
      expect(seenAgents).toContain('pasazer-aleja');
      expect(mission.result?.verdicts).toContainEqual(
        expect.objectContaining({ ruleId: 'MSC-02', kind: 'good' }),
      );
    }
  },
);

it('can use the Kraków route in the Licence exam', () => {
  const { mission } = runMissionRoute(
    examRoute('krakow', missionContent.balans.licencja),
    kazimierz,
  );
  expect(mission.result).toMatchObject({ status: 'completed' });
  expect(
    mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
  ).toEqual([]);
});

const illegalRoutes: Record<string, Waypoint[]> = {
  'KRA-A1-01': [{ x: 2050, y: 816, maxInput: 0.42 }],
  'KRA-A2-02': [{ x: 3620, y: 1511, maxInput: 0.42 }],
  'KRA-A3-03': [{ x: 3338, y: 2896 }],
  'KRA-A3-05': [{ x: 3338, y: 2896 }],
};

it('compares every marked shortcut with the corresponding clean ride', () => {
  expect(campaign.filter(({ skrot }) => skrot).map(({ id }) => id)).toEqual(
    Object.keys(illegalRoutes),
  );
  for (const [id, route] of Object.entries(illegalRoutes)) {
    const legal = runMissionRoute(id, routes[id]!).mission.result!;
    const illegal = runMissionRoute(id, route).mission.result!;
    expect(illegal, id).toMatchObject({
      status: 'completed',
      illegalShortcut: true,
      timeBonus: 0,
      timeBonusEligible: false,
    });
    expect(illegal.elapsedSeconds, id).toBeLessThan(legal.elapsedSeconds);
    const controlBonus = missionContent.balans.uwaga_drogowki.bonus_madra_glowa;
    expect(illegal.points + controlBonus, id).toBeLessThan(legal.points);
    expect(illegal.penaltyPoints, id).toBeGreaterThan(0);
  }
});
