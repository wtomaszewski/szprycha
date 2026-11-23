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
  JSON.parse(readFileSync('maps/gdansk.tmj', 'utf8')),
  settings.kafel_m,
);
const day: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };
const dusk: EnvState = { ...day, time: 'dusk' };

it('covers all traffic situations and M01–M07 through free-ride exercises', () => {
  const exercises = missionContent.misje.filter(
    ({ miasto }) => miasto === 'gdansk',
  );
  expect(exercises.every(({ akt, poboczna }) => akt === 0 && poboczna)).toBe(
    true,
  );
  const { situations, modules } = analyseMapCoverage(
    world,
    exercises,
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
    world.districts.map(({ id, unlock }) => [id, unlock?.missionId]),
  ).toEqual([
    ['dlugi-targ', undefined],
    ['zuraw', undefined],
    ['olowianka', 'GDA-B-01'],
    ['promenada', 'GDA-B-01'],
    ['plaza', 'GDA-B-03'],
    ['stocznia', 'GDA-B-04'],
  ]);
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
    const progress = cars.map(() => ({ tick: 0, junctions: 0 }));
    const visited = new Set<string>();
    for (let tick = 0; tick < 600 * TICKS_PER_SECOND; tick++) {
      traffic.step(tick >= world.duskAt * TICKS_PER_SECOND ? dusk : day);
      for (const [i, car] of cars.entries()) {
        const last = progress[i]!;
        if (last.junctions !== car.junctionsPassed) {
          last.tick = tick;
          last.junctions = car.junctionsPassed;
        }
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
    expect(visited.size).toBe(world.intersections.length);
    expect(
      Math.min(...progress.map(({ junctions }) => junctions)),
    ).toBeGreaterThan(10);
    for (const { id, trips } of traffic.routed)
      expect(trips, id).toBeGreaterThan(2);
  },
);

const routes: Record<string, Waypoint[]> = {
  'GDA-B-01': [
    { x: 1712, y: 1936, walking: true },
    { x: 1712, y: 2161 },
  ],
  'GDA-B-02': [
    { x: 2744, y: 2870, maxInput: 0.24, answer: 1 },
    { x: 3360, y: 2880, maxInput: 0.24, answer: 0 },
    { x: 3704, y: 2880, maxInput: 0.24 },
  ],
  'GDA-B-03': [
    { x: 2680, y: 2885, maxInput: 0.35 },
    { x: 2680, y: 3046, maxInput: 0.35 },
    { x: 3100, y: 3046, maxInput: 0.35 },
    { x: 3690, y: 3046, maxInput: 0.35 },
  ],
  'GDA-B-04': [
    { x: 2784, y: 1176, answer: 0, crossingGreen: 'aleja-przejazd' },
    { x: 2784, y: 926 },
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

it('rejects riding across the signed footbridge', () => {
  const { mission } = runMissionRoute('GDA-B-01', [
    { x: 1712, y: 1936, maxInput: 0.3 },
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    verdict: { ruleId: 'GDZIE-09' },
  });
});

it('rejects the signed dune shortcut without awarding a time bonus', () => {
  const { mission } = runMissionRoute('GDA-B-03', [
    { x: 2976, y: 2885, maxInput: 0.3 },
    { x: 2976, y: 2952, maxInput: 0.3 },
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    timeBonus: 0,
    verdict: { ruleId: 'ZNAK-B1' },
  });
});

it('requires a lower riding speed on the sandy coastal road', () => {
  const points = routes['GDA-B-03']!.map((point, i) =>
    i < 2 ? point : { ...point, maxInput: 1 },
  );
  const { mission } = runMissionRoute('GDA-B-03', points);
  expect(mission.result).toMatchObject({
    status: 'failed',
    verdict: { ruleId: 'MAN-08' },
  });
});

it('rejects entering the cycle crossing against S-6', () => {
  const points = routes['GDA-B-04']!.map((point) => ({
    ...point,
    crossingGreen: undefined,
  }));
  const { mission } = runMissionRoute('GDA-B-04', points);
  expect(mission.result).toMatchObject({
    status: 'failed',
    verdict: { ruleId: 'SYG-02' },
  });
});

it('flags riding too fast near a pedestrian on the shared promenade', () => {
  const { mission } = runMissionRoute('GDA-B-02', [
    routes['GDA-B-02']![0]!,
    { x: 3330, y: 2844, maxInput: 1 },
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    verdict: { ruleId: 'GDZIE-11' },
  });
});
