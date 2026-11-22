import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { readContent } from '../../tools/content';
import { IntersectionManager } from '../../src/rules/priority/IntersectionManager';
import { TICKS_PER_SECOND, type EnvState } from '../../src/rules/types';
import { WorldModel } from '../../src/rules/world/WorldModel';
import { TrafficParticipants } from '../../src/sim/TrafficParticipants';

const settings = (await readContent()).balans.silnik;
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
  'keeps Warsaw traffic running for ten simulated minutes (seed %s)',
  (seed) => {
    const traffic = new TrafficParticipants(
      world,
      new IntersectionManager(world),
      settings,
      seed,
    );
    const { agents, radius } = traffic.road;
    expect(agents).toHaveLength(world.trafficCarCount);
    const crossings = new Set<string>();
    const latest = agents.map(() => ({ tick: 0, passed: 0 }));
    for (let tick = 0; tick < 600 * TICKS_PER_SECOND; tick++) {
      traffic.step(env);
      for (const [i, car] of agents.entries()) {
        const progress = latest[i]!;
        if (car.junctionsPassed !== progress.passed) {
          progress.tick = tick;
          progress.passed = car.junctionsPassed;
        }
        if (car.laneId) crossings.add(car.laneId);
        if (tick - progress.tick > 90 * TICKS_PER_SECOND)
          throw new Error(
            `${car.id} stopped clearing junctions at second ${tick / TICKS_PER_SECOND} (${car.laneId})`,
          );
        for (let j = i + 1; j < agents.length; j++) {
          const other = agents[j]!;
          if (
            Math.hypot(car.pos.x - other.pos.x, car.pos.y - other.pos.y) <
            2 * radius
          )
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
      expect.arrayContaining(['fabryka-E', 'zamek-W']),
    );
    for (const id of ['pieszy-zamkowy', 'spacer-deptak'])
      expect(
        traffic.routed.find((agent) => agent.id === id)!.trips,
      ).toBeGreaterThan(2);
    expect(Math.min(...latest.map(({ passed }) => passed))).toBeGreaterThan(25);
  },
);
