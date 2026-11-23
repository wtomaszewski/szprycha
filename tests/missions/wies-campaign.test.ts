import { expect, it } from 'vitest';
import { MissionProgress } from '../../src/gameplay/MissionProgress';
import { licenceRequirements } from '../../src/gameplay/exam/exam';
import { examRoute } from '../../src/gameplay/exam/route';
import { missionContent, runMissionRoute } from './run-mission-route';
import type { Waypoint } from './warsaw-routes';

const campaign = missionContent.misje.filter(({ miasto }) => miasto === 'wies');
const railStop = { x: 1170, y: 1290, maxInput: 0.42, wait: 1 };
const railEnd = { x: 1170, y: 1140, maxInput: 0.42 };
const gate = { x: 942, y: 2240, maxInput: 0.3 };

const routes: Record<string, Waypoint[]> = {
  'WIE-A1-01': [
    { x: 1208, y: 552, maxInput: 0.42, answer: 0 },
    { x: 1208, y: 288, maxInput: 0.24 },
  ],
  'WIE-A1-02': [
    { x: 1272, y: 340, walking: true },
    { x: 1328, y: 340 },
    { x: 1384, y: 340 },
  ],
  'WIE-A2-01': [{ ...railStop, answer: 1 }, railEnd],
  'WIE-A2-02': [{ x: 1012, y: 2106, maxInput: 0.42 }],
  'WIE-A3-01': [
    { x: 3798, y: 662, maxInput: 0.28, answer: 1 },
    { x: 3798, y: 662, answer: 0 },
  ],
  'WIE-A3-02': [
    { ...gate, answer: 1 },
    { ...gate, answer: 0 },
    { x: 1016, y: 2240, maxInput: 0.3, signal: 'right' },
    { x: 1016, y: 2384, maxInput: 0.42 },
  ],
};

it('opens all three acts in order and preserves completed free-ride training', async () => {
  const progress = new MissionProgress();
  await progress.selectCity('wies');
  expect(progress.selectedCity).toBe('wies');
  expect(progress.nextMission('wies', missionContent)?.id).toBe('WIE-B-01');
  expect(progress.isAvailable(campaign[4]!, missionContent)).toBe(false);
  progress.store.change((profile) => {
    profile.completed = ['WIE-B-04', 'WIE-B-02', 'WIE-B-01', 'WIE-B-03'];
  });
  expect(campaign.map(({ akt }) => akt)).toEqual([
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3,
  ]);
  for (const definition of campaign.filter(({ akt }) => akt > 0)) {
    expect(progress.nextMission('wies', missionContent)?.id).toBe(
      definition.id,
    );
    progress.complete(definition);
  }
  expect(progress.nextMission('wies', missionContent)).toBeUndefined();
  expect(
    licenceRequirements(progress.store.profile, missionContent).cities,
  ).toEqual(['wies']);
});

it('covers M01–M07 in the main missions alone', () => {
  const ruleIds = new Set(
    campaign
      .filter(({ akt }) => akt > 0)
      .flatMap(({ reguly_cwiczone }) => reguly_cwiczone),
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

it.each(Object.entries(routes))('completes %s legally', (id, route) => {
  const { mission, collision } = runMissionRoute(id, route);
  expect(
    mission.result,
    JSON.stringify(mission.result?.verdicts),
  ).toMatchObject({ status: 'completed' });
  expect(
    mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
  ).toEqual([]);
  expect(collision).toBe(false);
  if (id === 'WIE-A2-01')
    expect(mission.result?.verdicts).toContainEqual(
      expect.objectContaining({
        ruleId: 'MSC-01',
        kind: 'good',
        evidence: expect.not.objectContaining({ answer: expect.anything() }),
      }),
    );
  if (id === 'WIE-A2-02')
    expect(mission.result?.verdicts).toContainEqual(
      expect.objectContaining({ ruleId: 'WYP-06', kind: 'good' }),
    );
});

it('completes the licence route with a safe railway stop', () => {
  const { mission } = runMissionRoute(
    examRoute('wies', missionContent.balans.licencja),
    [railStop, railEnd],
  );
  expect(mission.result).toMatchObject({ status: 'completed' });
  expect(
    mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
  ).toEqual([]);
});

it('denies credit and the time bonus for the closed farm shortcut', () => {
  const { mission } = runMissionRoute('WIE-A3-02', [
    { ...gate, answer: 1 },
    { ...gate, answer: 0 },
    { x: 942, y: 2320, maxInput: 0.24 },
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    timeBonus: 0,
    verdict: { ruleId: 'ZNAK-B1' },
  });
});
