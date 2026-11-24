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
  JSON.parse(readFileSync('maps/poznan.tmj', 'utf8')),
  settings.kafel_m,
);
const day: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };
const dusk: EnvState = { ...day, time: 'dusk' };

it('covers all traffic situations and M01–M07 on the Poznań map', () => {
  const training = missionContent.misje.filter(
    ({ miasto, akt }) => miasto === 'poznan' && akt === 0,
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
  expect(modules).toHaveLength(7);
  for (const { module, missions } of modules)
    expect(missions, module).not.toHaveLength(0);
  expect(
    world.trafficRoutes.find(({ kind }) => kind === 'tram')?.platforms,
  ).toHaveLength(1);
  expect(world.crossings.find(({ tramPlatform }) => tramPlatform)?.id).toBe(
    'zebra-na-wysepke',
  );
});

it.each([1403, 17, 51])(
  'keeps all routes moving for ten simulated minutes (seed %i)',
  (seed) => {
    const traffic = new TrafficParticipants(
      world,
      new IntersectionManager(world),
      settings,
      seed,
      'ambient',
    );
    const cars = traffic.road.agents;
    const vehicles = [
      ...cars,
      ...traffic.routed.filter(({ kind }) => kind === 'tram'),
    ];
    const progress = cars.map(({ pos }) => ({ tick: 0, ...pos }));
    const visited = new Set<string>();
    const tram = traffic.routed.find(({ kind }) => kind === 'tram')!;
    const platform = world.trafficRoutes.find(({ id }) => id === tram.id)!
      .platforms[0]!;
    const platformY = platform.distance;
    let servedPlatform = false;
    for (let tick = 0; tick < 600 * TICKS_PER_SECOND; tick++) {
      traffic.step(tick >= world.duskAt * TICKS_PER_SECOND ? dusk : day);
      if (tram.active && tram.pos.y === platformY && tram.speed === 0)
        servedPlatform = true;
      for (const [i, car] of cars.entries()) {
        const last = progress[i]!;
        if (Math.hypot(car.pos.x - last.x, car.pos.y - last.y) >= 1)
          Object.assign(last, car.pos, { tick });
        if (car.laneId) visited.add(world.getLane(car.laneId)!.intersection.id);
        if (tick - last.tick > 105 * TICKS_PER_SECOND)
          throw new Error(
            `${car.id} stalled at ${car.laneId} (${tick / TICKS_PER_SECOND}s)`,
          );
        for (let j = i + 1; j < vehicles.length; j++) {
          const other = vehicles[j]!;
          if (
            (!('active' in other) || other.active) &&
            footprintsOverlap(car, other)
          )
            throw new Error(
              `${car.id} overlaps ${other.id} (${tick / TICKS_PER_SECOND}s)`,
            );
        }
      }
    }
    expect(servedPlatform).toBe(true);
    expect(visited.size).toBe(world.intersections.length);
    expect(
      Math.min(...cars.map(({ junctionsPassed }) => junctionsPassed)),
    ).toBeGreaterThan(10);
    for (const { id, trips } of traffic.routed)
      expect(trips, id).toBeGreaterThan(2);
  },
);

const routes: Record<string, Waypoint[]> = {
  'POZ-B-01': [
    { x: 1510, y: 877, answer: 0, maxInput: 0.38 },
    { x: 1810, y: 877, maxInput: 0.38 },
    { x: 2030, y: 801, maxInput: 0.38 },
  ],
  'POZ-B-02': [
    { x: 2272, y: 1136, answer: 1, mainGreen: 'aleja-W' },
    { x: 2660, y: 1136 },
  ],
  'POZ-B-03': [
    { x: 2530, y: 632, answer: 0, maxInput: 0.35, until: 'traffic-ended' },
    { x: 2530, y: 504, maxInput: 0.35 },
  ],
  'POZ-B-04': [
    { x: 1652, y: 1622, answer: 0, maxInput: 0.35 },
    { x: 1712, y: 1622, maxInput: 0.25, signal: 'right' },
    { x: 1712, y: 1848, maxInput: 0.35 },
    { x: 1712, y: 2080, answer: 1, maxInput: 0.35 },
    { x: 1720, y: 2150, maxInput: 0.35 },
  ],
};

it.each(Object.entries(routes))(
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
  },
);

it('rejects the signed market shortcut without awarding a time bonus', () => {
  const { mission } = runMissionRoute('POZ-B-01', [
    routes['POZ-B-01']![0]!,
    { x: 1580, y: 783, maxInput: 0.35 },
    { x: 1680, y: 783, maxInput: 0.35 },
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    timeBonus: 0,
    verdict: { ruleId: 'ZNAK-B1' },
  });
});

it('lets the rider enter the bicycle box on red but rejects entering the intersection', () => {
  const [stop, finish] = routes['POZ-B-02']!;
  const { mission } = runMissionRoute('POZ-B-02', [
    { ...stop!, mainGreen: undefined, mainRed: 'aleja-W' },
    finish!,
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    verdict: { ruleId: 'SYG-01' },
  });
});
