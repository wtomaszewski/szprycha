import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { IntersectionManager } from '../../src/rules/priority/IntersectionManager';
import { TICKS_PER_SECOND, type EnvState } from '../../src/rules/types';
import { footprintsOverlap } from '../../src/rules/world/Footprint';
import { WorldModel } from '../../src/rules/world/WorldModel';
import { TrafficParticipants } from '../../src/sim/TrafficParticipants';
import { analyseMapCoverage } from '../../tools/map-coverage';
import { missionContent, runMissionRoute } from '../missions/run-mission-route';
import type { Waypoint } from '../missions/warsaw-routes';

const settings = missionContent.balans.silnik;
const world = new WorldModel(
  JSON.parse(readFileSync('maps/lodz.tmj', 'utf8')),
  settings.kafel_m,
);
const day: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };
const dusk: EnvState = { ...day, time: 'dusk' };

it('covers 13 road situations and teaches M01–M07 in Łódź', () => {
  const training = missionContent.misje.filter(
    ({ miasto, akt }) => miasto === 'lodz' && akt === 0,
  );
  const { situations, modules } = analyseMapCoverage(
    world,
    training,
    missionContent.przepisy.przepisy,
  );
  expect(Object.keys(situations)).toHaveLength(13);
  for (const [name, parts] of Object.entries(situations))
    expect(
      parts.every((objects) => objects.length > 0),
      name,
    ).toBe(true);
  for (const { module, missions } of modules)
    expect(missions, module).not.toHaveLength(0);
});

it.each([139, 17, 51])(
  'keeps cars, tram, pedestrians and cycle routes moving for ten minutes (seed %i)',
  (seed) => {
    const traffic = new TrafficParticipants(
      world,
      new IntersectionManager(world),
      settings,
      seed,
      'ambient',
    );
    const cars = traffic.road.agents;
    const progress = cars.map(({ pos }) => ({ tick: 0, ...pos }));
    const visited = new Set<string>();
    const routed = traffic.routed.filter(
      ({ id }) =>
        !world.trafficRoutes.find((route) => route.id === id)?.event_only,
    );
    const vehicles = [
      ...cars,
      ...routed.filter(({ kind }) => kind !== 'pedestrian'),
    ];
    for (let tick = 0; tick < 600 * TICKS_PER_SECOND; tick++) {
      traffic.step(tick >= world.duskAt * TICKS_PER_SECOND ? dusk : day);
      for (const [i, car] of cars.entries()) {
        const last = progress[i]!;
        if (Math.hypot(car.pos.x - last.x, car.pos.y - last.y) >= 1)
          Object.assign(last, car.pos, { tick });
        if (car.laneId) visited.add(world.getLane(car.laneId)!.intersection.id);
        if (tick - last.tick > 105 * TICKS_PER_SECOND)
          throw new Error(
            `${car.id} stalled at ${car.laneId} (${tick / TICKS_PER_SECOND}s)`,
          );
      }
      for (const [i, agent] of vehicles.entries()) {
        if ('active' in agent && !agent.active) continue;
        for (let j = i + 1; j < vehicles.length; j++) {
          const other = vehicles[j]!;
          if (
            (!('active' in other) || other.active) &&
            footprintsOverlap(agent, other)
          )
            throw new Error(
              `${agent.id} overlaps ${other.id} (${tick / TICKS_PER_SECOND}s)`,
            );
        }
      }
    }
    expect(visited.size).toBe(world.intersections.length);
    expect(
      Math.min(...cars.map(({ junctionsPassed }) => junctionsPassed)),
    ).toBeGreaterThan(10);
    for (const { id, trips } of routed) expect(trips, id).toBeGreaterThan(2);
  },
);

const courses: Record<string, Waypoint[]> = {
  'LOD-B-01': [
    { x: 1490, y: 861, answer: 0, wait: 5, maxInput: 0.35 },
    { x: 1830, y: 861, answer: 1, maxInput: 0.35 },
    { x: 2090, y: 861, maxInput: 0.35 },
  ],
  'LOD-B-02': [
    { x: 1478, y: 742, answer: 0, maxInput: 0.35 },
    { x: 1710, y: 742, maxInput: 0.35 },
    { x: 2050, y: 742, maxInput: 0.35 },
  ],
  'LOD-B-03': [
    { x: 3120, y: 952, answer: 1, maxInput: 0.35 },
    { x: 3120, y: 832, maxInput: 0.35 },
    { x: 3120, y: 716, maxInput: 0.35 },
  ],
  'LOD-B-04': [
    { x: 3268, y: 1228, answer: 0, wait: 4, maxInput: 0.28 },
    { x: 3268, y: 1112, maxInput: 0.32 },
  ],
};

it.each(Object.entries(courses))(
  'completes %s without violations',
  (id, points) => {
    const { mission, rider, target } = runMissionRoute(id, points);
    expect(
      mission.result,
      JSON.stringify({ target, rider, result: mission.result }),
    ).toMatchObject({ status: 'completed' });
    expect(
      mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
    ).toEqual([]);
    if (id === 'LOD-B-02') {
      const passes = mission.result?.verdicts.flatMap(
        ({ ruleId, highlight }) =>
          ruleId === 'MAN-14' && highlight?.agentId ? [highlight.agentId] : [],
      );
      expect(new Set(passes)).toEqual(new Set(['rower-cargo', 'riksza']));
    }
    if (id === 'LOD-B-04')
      expect(mission.result?.verdicts).toContainEqual(
        expect.objectContaining({
          ruleId: 'MSC-03',
          kind: 'good',
          highlight: expect.objectContaining({ zoneId: 'brama-podworka' }),
        }),
      );
  },
);

it('fails the exercise and awards no time bonus for the prohibited shortcut', () => {
  const { mission } = runMissionRoute('LOD-B-01', [
    courses['LOD-B-01']![0]!,
    { x: 1578, y: 799, maxInput: 0.32 },
    { x: 1712, y: 799, maxInput: 0.32 },
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    timeBonus: 0,
    verdict: { ruleId: 'ZNAK-B1' },
  });
});

it('rejects riding against the general lane beside the contraflow lane', () => {
  const { mission } = runMissionRoute('LOD-B-03', [
    courses['LOD-B-03']![0]!,
    { x: 3064, y: 856, maxInput: 0.3 },
    { x: 3064, y: 716, maxInput: 0.3 },
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    verdict: {
      ruleId: 'GDZIE-02',
      highlight: { zoneId: 'uliczka-jednokierunkowa' },
    },
  });
});
