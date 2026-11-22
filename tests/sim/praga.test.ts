import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { readContent } from '../../tools/content';
import { analyseMapCoverage } from '../../tools/map-coverage';
import { IntersectionManager } from '../../src/rules/priority/IntersectionManager';
import { TICKS_PER_SECOND, type EnvState } from '../../src/rules/types';
import { footprintsOverlap } from '../../src/rules/world/Footprint';
import { WorldModel } from '../../src/rules/world/WorldModel';
import { TrafficParticipants } from '../../src/sim/TrafficParticipants';

const content = await readContent();
const settings = content.balans.silnik;
const world = new WorldModel(
  JSON.parse(readFileSync('maps/warszawa.tmj', 'utf8')),
  settings.kafel_m,
);
const env: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };

it('routes cars around the island and gives circulating traffic priority', () => {
  const manager = new IntersectionManager(world);
  const inlet = world.getLane('rondo-N-N')!;
  const ring = world.getLane('rondo-N-E')!;
  expect(
    manager.mustYield(
      inlet,
      'right',
      {
        id: 'car',
        kind: 'car',
        pos: ring.end,
        heading: Math.PI,
        speed: 3,
        laneId: ring.id,
        maneuver: 'straight',
      },
      0,
      env,
    ),
  ).toBe('PIER-08');
  const movements = world.laneGraph.movements.filter(
    ({ from }) => from.lane?.intersection.kind === 'roundabout',
  );
  expect(movements).toHaveLength(12);
  const minRadius = 93;
  for (const path of [
    ...movements.map(({ path }) => path),
    ...world.laneGraph.edges
      .filter(({ lane }) => lane?.priorityClass === 'roundabout_ring')
      .map(({ path }) => path),
  ]) {
    const pos = { x: 0, y: 0 };
    for (let distance = 0; distance <= path.length; distance += 0.1) {
      path.place(distance, pos);
      expect(
        Math.hypot(
          pos.x / world.metersPerPixel - 1856,
          pos.y / world.metersPerPixel - 1088,
        ),
      ).toBeGreaterThan(minRadius);
    }
  }
});

it.each([1403, 17])(
  'keeps traffic moving in the old and new districts for ten simulated minutes (seed %s)',
  (seed) => {
    const traffic = new TrafficParticipants(
      world,
      new IntersectionManager(world),
      settings,
      seed,
    );
    const { agents } = traffic.road;
    expect(agents).toHaveLength(world.trafficCarCount);
    const crossings = new Set<string>();
    const tram = traffic.routed.find(({ id }) => id === 'tramwaj-aleja')!;
    let tramStoppedAtPlatform = false;
    const latest = agents.map(() => ({ tick: 0, passed: 0 }));
    for (let tick = 0; tick < 600 * TICKS_PER_SECOND; tick++) {
      traffic.step(env);
      if (tram.active && tram.intent === 'boarding' && !tram.stopId)
        tramStoppedAtPlatform = true;
      for (const [i, car] of agents.entries()) {
        const progress = latest[i]!;
        if (car.junctionsPassed !== progress.passed) {
          progress.tick = tick;
          progress.passed = car.junctionsPassed;
        }
        if (car.laneId) crossings.add(car.laneId);
        if (tram.active && footprintsOverlap(car, tram))
          throw new Error(`${car.id} overlapped the tram at tick ${tick}`);
        if (tick - progress.tick > 90 * TICKS_PER_SECOND)
          throw new Error(
            `${car.id} stopped clearing junctions at second ${tick / TICKS_PER_SECOND} (${car.laneId})`,
          );
        for (let j = i + 1; j < agents.length; j++) {
          const other = agents[j]!;
          if (footprintsOverlap(car, other))
            throw new Error(
              `${car.id} overlapped ${other.id} at second ${tick / TICKS_PER_SECOND}`,
            );
        }
      }
    }
    expect([...crossings].filter((id) => id.startsWith('rondo-'))).toHaveLength(
      8,
    );
    expect([...crossings]).toEqual(
      expect.arrayContaining([
        'fabryka-E',
        'zamek-W',
        'pod-palacem-N',
        'pod-palacem-E',
        'pod-palacem-S',
        'pod-palacem-W',
        'mokotow-stacja-N',
        'mokotow-stacja-S',
        'mokotow-stacja-E',
      ]),
    );
    for (const id of [
      'pieszy-zamkowy',
      'spacer-deptak',
      'tramwaj-aleja',
      'pasazer-pod-palacem',
      'pieszy-pod-palacem',
      'spacer-przy-fontannach',
      'rowerzysta-bulwary',
    ])
      expect(
        traffic.routed.find((agent) => agent.id === id)!.trips,
      ).toBeGreaterThan(2);
    expect(Math.min(...latest.map(({ passed }) => passed))).toBeGreaterThan(25);
    expect(tramStoppedAtPlatform).toBe(true);
  },
);

it('covers all 13 Warsaw situations with the required road variants', () => {
  const { situations } = analyseMapCoverage(
    world,
    [],
    content.przepisy.przepisy,
  );
  expect(Object.keys(situations)).toHaveLength(13);
  for (const [name, parts] of Object.entries(situations))
    expect(
      parts.every((objects) => objects.length > 0),
      name,
    ).toBe(true);

  const guarded = world.crossings.find(
    ({ id }) => id === 'mokotow-przejazd-z-zaporami',
  )!;
  const unguarded = world.crossings.find(
    ({ id }) => id === 'mokotow-przejazd-bez-zapor',
  )!;
  expect(world.railState(guarded, 4, env)).toEqual({
    barrier: 'open',
    flashing: false,
  });
  expect(world.railState(guarded, 23, env)).toEqual({
    barrier: 'closed',
    flashing: true,
  });
  expect(world.railState(unguarded, 4, env)).toEqual({
    barrier: 'open',
    flashing: false,
  });
  expect(world.railState(unguarded, 19, env)).toEqual({
    barrier: 'open',
    flashing: true,
  });
  expect(world.railTrainX(guarded, 4)).toBeUndefined();
  expect(world.railTrainX(unguarded, 19)).toBeGreaterThan(unguarded.x);
  const bikeCrossing = world.crossings.find(
    ({ id }) => id === 'pod-palacem-przejazd',
  )!;
  const inlet = world.getLane('pod-palacem-N')!;
  expect(world.phase(inlet, 2, env)).toBe('arrow');
  expect(world.crossingPhase(bikeCrossing, 2, env)).toBe('red');
  expect(world.crossingPhase(bikeCrossing, 39, env)).toBe('green');
  for (const side of ['N', 'S', 'E', 'W'])
    expect(world.phase(world.getLane(`pod-palacem-${side}`)!, 39, env)).toBe(
      'red',
    );

  expect(world.duskAt).toBe(90);
  expect(world.duskInFreeRideOnly).toBe(true);
  const b2 = world.signs.find(({ id }) => id === 'kontraruch-b2-t22')!;
  expect(b2).toMatchObject({ code: 'B-2', facing: 'S', exceptBicycles: true });
  expect(
    world.zones.find(({ id }) => id === 'kontrapas-centrum'),
  ).toMatchObject({
    kind: 'bike_lane',
    direction: 'N',
  });
});
