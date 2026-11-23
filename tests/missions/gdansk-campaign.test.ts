import { expect, it } from 'vitest';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { licenceRequirements } from '../../src/gameplay/exam/exam';
import { examRoute } from '../../src/gameplay/exam/route';
import { missionContent, runMissionRoute } from './run-mission-route';
import type { Waypoint } from './warsaw-routes';

const campaign = missionContent.misje.filter(
  ({ miasto }) => miasto === 'gdansk',
);
const footbridge: Waypoint[] = [
  { x: 1712, y: 1936, walking: true },
  { x: 1712, y: 2161 },
];
const cycleCrossing: Waypoint[] = [
  { x: 2784, y: 1176, answer: 0, crossingGreen: 'aleja-przejazd' },
  { x: 2784, y: 926 },
];
const routes: Record<string, Waypoint[]> = {
  'GDA-A1-01': [
    { x: 1370, y: 783, maxInput: 0.35 },
    { x: 2070, y: 783, maxInput: 0.35 },
    { x: 2070, y: 858, maxInput: 0.35 },
  ],
  'GDA-A1-02': [
    { x: 1490, y: 635, walking: true },
    { x: 1748, y: 618 },
    { x: 2000, y: 650 },
  ],
  'GDA-A1-03': footbridge,
  'GDA-A2-01': cycleCrossing,
  'GDA-A2-02': [
    { x: 2528, y: 1180, mainGreen: 'aleja-S' },
    { x: 2528, y: 968 },
    { x: 2528, y: 856, until: 'tram-stopped' },
    { x: 2528, y: 856, until: 'tram-cleared' },
    { x: 2528, y: 530 },
  ],
  'GDA-A2-03': [
    { x: 1104, y: 3190, railOpen: 'olowianka-kolej' },
    { x: 1104, y: 3050 },
    { x: 1104, y: 2820 },
  ],
  'GDA-A3-01': [
    { x: 2680, y: 2885, maxInput: 0.35 },
    { x: 2680, y: 3046, maxInput: 0.35 },
    { x: 3690, y: 3046, maxInput: 0.35 },
  ],
  'GDA-A3-02': [
    { x: 3360, y: 2880, maxInput: 0.24, answer: 1 },
    { x: 3360, y: 2880, answer: 0 },
    { x: 3360, y: 2880, answer: 1 },
    { x: 3704, y: 2880, maxInput: 0.24 },
  ],
  'GDA-A3-03': [
    { x: 3312, y: 1568, answer: 0 },
    { x: 3312, y: 1480, maxInput: 0.35 },
    { x: 3650, y: 1480, maxInput: 0.35 },
    { x: 3650, y: 1568, maxInput: 0.35 },
  ],
};

it('unlocks the training and three acts in order, then includes Gdańsk in the licence exam', () => {
  const progress = new MissionProgress();
  expect(campaign.map(({ akt }) => akt)).toEqual([
    0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3,
  ]);
  expect(campaign.filter(({ akt }) => akt > 0).map(({ id }) => id)).toEqual(
    Object.keys(routes),
  );
  for (const definition of campaign) {
    expect(definition.poboczna).toBeUndefined();
    expect(definition.dialog_start).toBeDefined();
    expect(definition.dialog_koniec).toBeDefined();
    expect(definition.zdarzenia_wymuszone).not.toHaveLength(0);
    expect(progress.nextMission('gdansk', missionContent)?.id).toBe(
      definition.id,
    );
    progress.complete(definition);
  }
  expect(progress.nextMission('gdansk', missionContent)).toBeUndefined();
  expect(
    licenceRequirements(progress.store.profile, missionContent).cities,
  ).toEqual(['gdansk']);
});

it('keeps saved Gdańsk training progress and still requires all exercises for act one', () => {
  const progress = new MissionProgress();
  const first = campaign.find(({ id }) => id === 'GDA-B-01')!;
  const crossing = campaign.find(({ id }) => id === 'GDA-B-04')!;
  progress.complete(first);
  expect(progress.isAvailable(crossing, missionContent)).toBe(true);
  progress.complete(crossing);
  expect(progress.nextMission('gdansk', missionContent)?.id).toBe('GDA-B-02');
});

it('fails the tram delivery if the rider enters while passengers are getting off', () => {
  const route = routes['GDA-A2-02']!;
  const { mission } = runMissionRoute('GDA-A2-02', [
    ...route.slice(0, 3),
    route[4]!,
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    verdict: { ruleId: 'MSC-02' },
  });
});

it('rejects entering the freight crossing while its warning lights flash', () => {
  const route = routes['GDA-A2-03']!;
  const { verdicts } = runMissionRoute(
    'GDA-A2-03',
    [{ ...route[0]!, railOpen: undefined, wait: 23 }, ...route.slice(1)],
    undefined,
    true,
  );
  expect(verdicts).toContainEqual(
    expect.objectContaining({
      kind: 'major',
      ruleId: 'MSC-01',
      evidence: expect.objectContaining({ flashing: true }),
    }),
  );
});

it.each(Object.entries(routes))(
  'completes %s legally on three stars',
  (id, route) => {
    const { mission, target, rider, verdicts, fired, seenAgents } =
      runMissionRoute(id, route);
    const where = JSON.stringify({ target, x: rider.x, y: rider.y });
    expect(
      (mission.result?.verdicts ?? verdicts).filter(
        ({ kind }) => kind !== 'good',
      ),
      where,
    ).toEqual([]);
    expect(mission.result, where).toMatchObject({
      status: 'completed',
      stars: 3,
      illegalShortcut: false,
    });
    expect(fired).toEqual(
      mission.definition.zdarzenia_wymuszone.map(({ typ }) => typ),
    );
    if (id === 'GDA-A2-02') {
      expect(seenAgents).toContain('pasazer-aleja');
      expect(mission.result?.verdicts).toContainEqual(
        expect.objectContaining({ ruleId: 'MSC-02', kind: 'good' }),
      );
    }
  },
);

it('completes the Gdańsk licence ride by waiting for the bike signal', () => {
  const { mission } = runMissionRoute(
    examRoute('gdansk', missionContent.balans.licencja),
    [
      { x: 2784, y: 1176, crossingGreen: 'aleja-przejazd' },
      { x: 2784, y: 926 },
    ],
  );
  expect(mission.result).toMatchObject({ status: 'completed' });
  expect(
    mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
  ).toEqual([]);
});

const shortcuts: Record<string, Waypoint[]> = {
  'GDA-A1-01': [{ x: 2070, y: 858, maxInput: 0.35 }],
  'GDA-A3-01': [
    { x: 2976, y: 2885, maxInput: 0.35 },
    { x: 2976, y: 3046, maxInput: 0.35 },
    { x: 3690, y: 3046, maxInput: 0.35 },
  ],
  'GDA-A3-03': [
    { x: 3312, y: 1568, answer: 0 },
    { x: 3650, y: 1568, maxInput: 0.35 },
  ],
};

it('scores every campaign shortcut lower than the corresponding legal detour', () => {
  expect(
    campaign.filter(({ skrot, akt }) => skrot && akt > 0).map(({ id }) => id),
  ).toEqual(Object.keys(shortcuts));
  for (const [id, route] of Object.entries(shortcuts)) {
    const legal = runMissionRoute(id, routes[id]!).mission.result!;
    const illegal = runMissionRoute(id, route).mission.result!;
    expect(illegal, id).toMatchObject({
      status: 'completed',
      illegalShortcut: true,
      timeBonus: 0,
      timeBonusEligible: false,
    });
    expect(illegal.elapsedSeconds, id).toBeLessThan(legal.elapsedSeconds);
    expect(illegal.penaltyPoints, id).toBeGreaterThan(0);
    const controlBonus = missionContent.balans.uwaga_drogowki.bonus_madra_glowa;
    expect(illegal.points + controlBonus, id).toBeLessThan(legal.points);
  }
});
