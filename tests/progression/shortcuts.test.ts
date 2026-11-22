import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { RuleEngine } from '../../src/rules/RuleEngine';
import { WorldModel } from '../../src/rules/world/WorldModel';
import { missionScore } from '../../src/progression/missionScore';
import {
  warsawRoutes,
  type WarsawMissionId,
  type Waypoint,
} from '../missions/warsaw-routes';
import { missionContent, runWarsawRoute } from '../missions/run-warsaw-route';

const shortcuts = missionContent.misje.filter(({ skrot }) => skrot);
const balance = missionContent.balans;
const { bonus_czasu_max, kara_minor, kara_major } = balance.misja;

it('uses two different marked shortcuts across the seven Warsaw orders', () => {
  expect(shortcuts.map(({ id, skrot }) => [id, skrot!.odcinek])).toEqual([
    ['WAW-A1-03', 'pasaz_pierogi'],
    ['WAW-A1-04', 'uliczka-jednokierunkowa'],
  ]);
});

it.each(shortcuts)(
  '$id: the legal route scores higher even against the largest possible shortcut time bonus',
  (definition) => {
    const id = definition.id as WarsawMissionId;
    const routes: { legal: Waypoint[]; shortcut?: Waypoint[] } =
      warsawRoutes[id];
    const race = Boolean(definition.wyscig);
    const ruleId = race ? 'ZNAK-B2T22' : 'ZNAK-B1';
    const rule = missionContent.przepisy.przepisy.find(
      ({ id }) => id === ruleId,
    )!;
    const legal = runWarsawRoute(id, routes.legal);
    const shortcut = runWarsawRoute(
      id,
      routes.shortcut!,
      race ? routes.legal.slice(3) : undefined,
    );
    const legalResult = legal.mission.result!;
    const shortcutResult = shortcut.mission.result!;
    expect(legalResult).toMatchObject({
      status: 'completed',
      timeBonusEligible: true,
      illegalShortcut: false,
    });
    expect(shortcutResult).toMatchObject({
      status: 'completed',
      illegalShortcut: true,
      timeBonusEligible: rule.waga_bledu === 'minor',
      verdicts: expect.arrayContaining([
        expect.objectContaining({ ruleId, kind: rule.waga_bledu }),
      ]),
    });
    expect(shortcut.collision).toBe(false);
    expect(legal.collision).toBe(false);
    if (!race)
      expect(shortcutResult.elapsedSeconds).toBeLessThan(
        legalResult.elapsedSeconds,
      );

    const legalBonus = missionScore(
      balance,
      definition,
      legalResult.elapsedSeconds,
      legalResult.verdicts,
      true,
    ).timeBonus;
    const shortcutNetBonus =
      rule.waga_bledu === 'major' ? -kara_major : bonus_czasu_max - kara_minor;
    const controlQuestionBonus = balance.uwaga_drogowki.bonus_madra_glowa;
    expect(shortcutNetBonus + controlQuestionBonus).toBeLessThan(legalBonus);
    expect(shortcutResult.points + controlQuestionBonus).toBeLessThan(
      legalResult.points,
    );
  },
);

it.each([
  { ruleId: 'ZNAK-B1', section: 'pasaz_pierogi', weight: 'major', heading: 0 },
  {
    ruleId: 'ZNAK-B2T22',
    section: 'uliczka-jednokierunkowa',
    weight: 'minor',
    heading: Math.PI / 2,
  },
] as const)(
  'reads $ruleId severity from the rules data',
  ({ ruleId, section, weight, heading }) => {
    const content = structuredClone(missionContent);
    content.przepisy.przepisy.find(({ id }) => id === ruleId)!.waga_bledu =
      weight;
    const world = new WorldModel(
      JSON.parse(readFileSync('maps/warszawa.tmj', 'utf8')),
      balance.silnik.kafel_m,
    );
    const zone = world.zones.find(({ id }) => id === section)!;
    const rules = new RuleEngine(world, content);
    rules.step(
      {
        id: 'player',
        pos: { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 },
        heading,
        speed: 2,
        mode: 'riding',
        signal: 'none',
        ageBand: '10to15',
        helmet: { worn: true, fastened: true },
      },
      [],
      { time: 'day', weather: 'clear', visibilityLow: false },
    );
    expect(rules.recent).toContainEqual(
      expect.objectContaining({ ruleId, kind: weight }),
    );
  },
);
