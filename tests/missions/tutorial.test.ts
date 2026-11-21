import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { readContent } from '../../tools/content';
import { MissionSystem } from '../../src/gameplay/MissionSystem';
import {
  stepRider,
  type Obstacle,
  type Rider,
} from '../../src/gameplay/bicycle';
import { RuleEngine } from '../../src/rules/RuleEngine';
import { WorldModel } from '../../src/rules/world/WorldModel';
import type { EnvState, RiderState, Verdict } from '../../src/rules/types';

interface TrainingMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: { name: string; objects?: Omit<Obstacle, 'kind'>[] }[];
}

async function runTutorial(
  script: { ticks: number; y: number; helmet: boolean }[],
) {
  const content = await readContent();
  const map = JSON.parse(
    await readFile('maps/miasteczko.tmj', 'utf8'),
  ) as TrainingMap;
  const world = new WorldModel(map, content.balans.silnik.kafel_m);
  const definition = content.misje.find(({ id }) => id === 'WAW-T-01')!;
  const mission = new MissionSystem(
    definition,
    world,
    content.balans.misja.major_do_porazki,
  );
  expect(definition.ruch_ai).toBe(false);
  const metersPerPixel = world.metersPerPixel;
  const obstacles: Obstacle[] = [
    ...map.layers
      .find(({ name }) => name === 'blocks')!
      .objects!.map((obj) => ({
        ...obj,
        kind: 'wall' as const,
      })),
    ...map.layers
      .find(({ name }) => name === 'collisions')!
      .objects!.map((obj) => ({
        ...obj,
        kind: 'curb' as const,
      })),
    ...world.parkedCars.map(({ x, y, width, height }) => ({
      x: x / metersPerPixel,
      y: y / metersPerPixel,
      width: width / metersPerPixel,
      height: height / metersPerPixel,
      kind: 'wall' as const,
    })),
  ];
  const env: EnvState = { time: 'day', visibilityLow: false, weather: 'clear' };
  const rider: Rider = { x: 0, y: 0, heading: 0, speed: 0, walking: false };
  const state: RiderState = {
    id: 'player',
    pos: { x: 0, y: 0 },
    heading: 0,
    speed: 0,
    mode: 'riding',
    ageBand: '10to15',
    signal: 'none',
    helmet: { worn: true, fastened: definition.start.kask_zapiety ?? true },
  };
  let rules = new RuleEngine(world, content.balans);
  const tickVerdicts: Verdict[] = [];
  const respawns: { x: number; y: number }[] = [];
  const events: string[] = [];
  const listen = () => rules.onVerdict((v) => tickVerdicts.push(v));
  const place = ({ x, y, heading }: typeof mission.start) =>
    Object.assign(rider, {
      x: x / metersPerPixel,
      y: y / metersPerPixel,
      heading,
      speed: 0,
    });
  listen();
  place(mission.start);
  for (const { ticks, y, helmet } of script) {
    state.helmet.fastened = helmet;
    for (let i = 0; i < ticks && !mission.result; i++) {
      expect(
        stepRider(
          rider,
          { x: 0, y, brake: y > 0, scheme: 'classic' },
          obstacles,
          map.width * map.tilewidth,
          map.height * map.tileheight,
        ),
      ).toBe(false);
      state.pos.x = rider.x * metersPerPixel;
      state.pos.y = rider.y * metersPerPixel;
      state.speed = rider.speed * metersPerPixel;
      state.heading = rider.heading;
      tickVerdicts.length = 0;
      rules.step(state, [], env);
      const effects = mission.step(state.pos, tickVerdicts);
      for (const event of effects?.events ?? []) events.push(event.typ);
      if (effects?.respawn) {
        place(effects.respawn);
        respawns.push(effects.respawn);
        rules = rules.afterCheckpoint();
        listen();
      }
    }
  }
  return { mission, rules, respawns, events };
}

// Accelerate towards B-20, brake to a full stop before P-12, then ride through.
const route = [
  { ticks: 170, y: -1, helmet: true },
  { ticks: 75, y: 1, helmet: true },
  { ticks: 250, y: -1, helmet: true },
];

it('completes WAW-T-01 headlessly using only scripted player input', async () => {
  const { mission, events } = await runTutorial(route);
  expect(mission.result).toMatchObject({
    missionId: 'WAW-T-01',
    status: 'completed',
    goodHabits: 1,
    timeBonusEligible: true,
    verdicts: [expect.objectContaining({ ruleId: 'ZNAK-STOP', kind: 'good' })],
  });
  expect(events).toEqual(['cwiczenie_stop']);
});

it('records KASK-01, restarts at the checkpoint and denies the time bonus', async () => {
  const { mission, respawns } = await runTutorial([
    { ticks: 1, y: -1, helmet: false },
    ...route,
  ]);
  expect(respawns).toEqual([mission.start]);
  expect(mission.result).toMatchObject({
    status: 'completed',
    timeBonusEligible: false,
    verdicts: [
      expect.objectContaining({ ruleId: 'KASK-01', kind: 'major' }),
      expect.objectContaining({ ruleId: 'ZNAK-STOP', kind: 'good' }),
    ],
  });
});

it('cannot finish after rolling through B-20', async () => {
  const { mission, rules } = await runTutorial([
    { ticks: 380, y: -1, helmet: true },
  ]);
  expect(mission.result).toBeUndefined();
  expect(mission.target?.goal.poi).toBe('tutorial_meta');
  expect(rules.recent).toContainEqual(
    expect.objectContaining({ ruleId: 'ZNAK-STOP', kind: 'minor' }),
  );
});
