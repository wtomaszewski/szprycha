import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { IntersectionManager } from '../../src/rules/priority/IntersectionManager';
import { RuleEngine } from '../../src/rules/RuleEngine';
import {
  TICKS_PER_SECOND,
  type EnvState,
  type RiderState,
} from '../../src/rules/types';
import { WorldModel } from '../../src/rules/world/WorldModel';
import { TrafficSimulation } from '../../src/sim/TrafficSimulation';
import { TrainingPedestrians } from '../../src/sim/TrainingPedestrians';
import { readContent } from '../../tools/content';

const balance = (await readContent()).balans;
const world = new WorldModel(
  JSON.parse(readFileSync('maps/miasteczko.tmj', 'utf8')),
  balance.silnik.kafel_m,
);
const clear: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };

function simulate(
  seed: number,
  count?: number,
  manager = new IntersectionManager(world),
) {
  return new TrafficSimulation(world, manager, balance.silnik, seed, count);
}

function rider(
  x: number,
  y: number,
  heading: number,
  speed: number,
): RiderState {
  return {
    id: 'player',
    pos: { x: x * world.metersPerPixel, y: y * world.metersPerPixel },
    heading,
    speed,
    mode: 'riding',
    signal: 'none',
    ageBand: '10to15',
    helmet: { worn: true, fastened: true },
  };
}

it.each([1403, 17])(
  'moves 14 cars for ten minutes without overlaps or deadlocks (seed %i)',
  (seed) => {
    const traffic = simulate(seed);
    const pedestrians = new TrainingPedestrians(world);
    const playerOffMap = { x: -10, y: -10 };
    const { agents } = traffic;
    expect(agents).toHaveLength(14);
    const lastPass = agents.map(() => ({ tick: 0, count: 0 }));
    const duration = 600 * TICKS_PER_SECOND;
    const diameterSquared = (2 * traffic.radius) ** 2;
    for (let tick = 0; tick < duration; tick++) {
      traffic.step(clear, undefined, pedestrians.agents);
      pedestrians.step(playerOffMap, agents);
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i]!;
        const previous = lastPass[i]!;
        if (a.junctionsPassed !== previous.count) {
          previous.count = a.junctionsPassed;
          previous.tick = tick;
        }
        if (tick - previous.tick > 90 * TICKS_PER_SECOND)
          throw new Error(
            `${a.id} went 90 seconds without clearing an intersection at ${tick / TICKS_PER_SECOND}s`,
          );
        for (let j = i + 1; j < agents.length; j++) {
          const b = agents[j]!;
          const distanceSquared =
            (a.pos.x - b.pos.x) ** 2 + (a.pos.y - b.pos.y) ** 2;
          if (distanceSquared < diameterSquared)
            throw new Error(
              `${a.id} collided with ${b.id} at ${tick / TICKS_PER_SECOND}s`,
            );
        }
      }
    }
    expect(
      Math.min(...agents.map(({ junctionsPassed }) => junctionsPassed)),
    ).toBeGreaterThan(25);
  },
);

it('reproduces traffic from the same seed after a reset', () => {
  const traffic = simulate(1403);
  const record = () =>
    Array.from({ length: 6 }, () => {
      for (let tick = 0; tick < 700; tick++) traffic.step(clear);
      return structuredClone(traffic.agents);
    });
  const first = record();
  traffic.reset();
  expect(record()).toEqual(first);
});

it('waits at red and refuses an S-2 arrow for a straight movement', () => {
  const traffic = simulate(469, 1);
  const car = traffic.agents[0]!;
  expect([car.laneId, car.maneuver]).toEqual(['lights-S', 'straight']);
  for (const phase of ['red', 'arrow', 'green'] as const) {
    const env = { ...clear, signalOverrides: { 'lights-S': phase } };
    for (let t = 0; t < 480; t++) traffic.step(env);
    if (phase === 'green') expect(car.junctionsPassed).toBeGreaterThan(0);
    else {
      expect(car.junctionProgress).toBeLessThan(0);
      expect(car.speed).toBe(0);
      expect(car.junctionsPassed).toBe(0);
    }
  }
});

it('stops on yellow when there is room and continues when braking would be unsafe', () => {
  const traffic = simulate(469, 1);
  const car = traffic.agents[0]!;
  const green: EnvState = {
    ...clear,
    signalOverrides: { 'lights-S': 'green' },
  };
  const yellow: EnvState = {
    ...clear,
    signalOverrides: { 'lights-S': 'yellow' },
  };
  for (const [distance, shouldEnter] of [
    [10, false],
    [1.25, true],
  ] as const) {
    traffic.reset();
    for (let t = 0; t < 480 && car.junctionProgress! < -distance; t++)
      traffic.step(green);
    expect(car.speed).toBeGreaterThan(4);
    expect(car.junctionProgress).toBeLessThan(0);
    for (let t = 0; t < 240 && car.junctionsPassed === 0; t++)
      traffic.step(yellow);
    expect(car.junctionsPassed > 0).toBe(shouldEnter);
    if (!shouldEnter) expect(car.speed).toBe(0);
  }
});

it('fully stops at S-2 and yields to green traffic before turning right', () => {
  const traffic = simulate(466, 1);
  const car = traffic.agents[0]!;
  expect([car.laneId, car.maneuver]).toEqual(['lights-S', 'right']);
  const env: EnvState = {
    ...clear,
    signalOverrides: { 'lights-S': 'arrow', 'lights-W': 'green' },
  };
  const priorityRider = rider(2028, 656, 0, 6);
  let stopTicks = 0;
  for (let t = 0; t < 480; t++) {
    traffic.step(env, priorityRider);
    if (car.speed === 0) stopTicks++;
    expect(car.junctionProgress).toBeLessThan(0);
  }
  expect(stopTicks).toBeGreaterThanOrEqual(
    balance.silnik.stop_czas_s * TICKS_PER_SECOND,
  );
  expect(car.intent).toBe('yield');
  for (let t = 0; t < 240 && car.junctionsPassed === 0; t++) traffic.step(env);
  expect(car.junctionsPassed).toBe(1);
});

it('reports protective braking to the rule engine as a priority violation', () => {
  const manager = new IntersectionManager(world);
  const traffic = simulate(9, 1, manager);
  const rules = new RuleEngine(world, balance, manager);
  const car = traffic.agents[0]!;
  const player = rider(1264, 511, Math.PI / 2, 3.5);
  // Bring a main-road car close to its actual conflict with the rider.
  for (let t = 0; t < 6000; t++) {
    if (
      car.laneId === 'yield-E' &&
      car.maneuver === 'straight' &&
      (car.junctionProgress ?? -Infinity) > 3
    )
      break;
    traffic.step(clear);
  }
  expect(car.laneId).toBe('yield-E');
  rules.step(player, traffic.agents, clear);
  player.pos.y = 513 * world.metersPerPixel;
  traffic.step(clear, player);
  rules.step(player, traffic.agents, clear);
  expect(car.protectiveBrake).toBe(true);
  expect(rules.recent).toContainEqual(
    expect.objectContaining({
      ruleId: 'PIER-02',
      kind: 'major',
      evidence: expect.objectContaining({
        protectiveBrake: true,
        conflictWith: car.id,
      }),
    }),
  );
});

function riderAtApproach(laneId: string, distance: number, speed: number) {
  const { end, forward } = world.getLane(laneId)!;
  return rider(
    (end.x - distance * forward.x) / world.metersPerPixel,
    (end.y - distance * forward.y) / world.metersPerPixel,
    Math.atan2(forward.y, forward.x),
    speed,
  );
}

it.each([
  ['equal-N', 'equal-W', 4609, 0],
  ['equal-N', 'equal-W', 4609, 3],
  ['yield-N', 'yield-W', 2414, 0],
] as const)(
  '%s yields to the rider on %s (seed %i, speed %i m/s)',
  (carLane, riderLane, seed, speed) => {
    const traffic = simulate(seed, 1);
    const car = traffic.agents[0]!;
    expect([car.laneId, car.maneuver]).toEqual([carLane, 'straight']);
    const player = riderAtApproach(riderLane, 1, speed);

    for (let tick = 0; tick < 480; tick++) {
      traffic.step(clear, player);
      expect(car.junctionProgress).toBeLessThan(0);
      expect(car.junctionsPassed).toBe(0);
    }
    expect(car.speed).toBe(0);
    expect(car.intent).toBe('yield');

    for (let tick = 0; tick < 240 && car.junctionsPassed === 0; tick++)
      traffic.step(clear);
    expect(car.junctionsPassed).toBe(1);
  },
);

function queueStraightCars(seed: number, laneIds: string[]) {
  const traffic = simulate(seed, laneIds.length);
  const cars = laneIds.map((laneId) =>
    traffic.agents.find((car) => car.laneId === laneId),
  );
  expect(cars.map((car) => car?.maneuver)).toEqual(
    laneIds.map(() => 'straight'),
  );
  const red: EnvState = {
    ...clear,
    signalOverrides: Object.fromEntries(laneIds.map((id) => [id, 'red'])),
  };
  for (let tick = 0; tick < 480; tick++) traffic.step(red);
  for (const car of traffic.agents) {
    expect(car.speed).toBe(0);
    expect(car.junctionProgress).toBeCloseTo(-0.85);
  }
  return traffic;
}

it.each([
  ['stop-N', 'stop-W', 13686],
  ['equal-N', 'equal-W', 4609],
] as const)(
  '%s lets the car on %s cross first (seed %i)',
  (yieldingLane, priorityLane, seed) => {
    const traffic = queueStraightCars(seed, [yieldingLane, priorityLane]);
    const yielding = traffic.agents.find((car) => car.laneId === yieldingLane)!;
    const priority = traffic.agents.find((car) => car.laneId === priorityLane)!;
    if (yieldingLane === 'stop-N')
      expect(world.getLane(yieldingLane)?.stopSign?.code).toBe('B-20');

    for (let tick = 0; tick < 240 && priority.junctionsPassed === 0; tick++) {
      traffic.step(clear);
      expect(yielding.junctionProgress).toBeLessThan(0);
    }
    expect(priority.junctionsPassed).toBe(1);
    for (let tick = 0; tick < 240 && yielding.junctionsPassed === 0; tick++)
      traffic.step(clear);
    expect(yielding.junctionsPassed).toBe(1);
  },
);

it('clears a four-car right-hand priority cycle', () => {
  const traffic = queueStraightCars(809922, [
    'equal-N',
    'equal-E',
    'equal-S',
    'equal-W',
  ]);
  for (let tick = 0; tick < 20 * TICKS_PER_SECOND; tick++) traffic.step(clear);
  expect(traffic.agents.every((car) => car.junctionsPassed > 0)).toBe(true);
});

it('breaks a right-hand priority cycle without releasing the car that yields to the rider', () => {
  const traffic = queueStraightCars(43430, ['equal-N', 'equal-E', 'equal-S']);
  const yielding = traffic.agents.find((car) => car.laneId === 'equal-N')!;
  const player = riderAtApproach('equal-W', 1, 0);

  for (let tick = 0; tick < 480; tick++) {
    traffic.step(clear, player);
    expect(yielding.junctionProgress).toBeLessThan(0);
    expect(yielding.junctionsPassed).toBe(0);
  }
  expect(yielding.intent).toBe('yield');
  expect(traffic.agents.some((car) => car.junctionsPassed > 0)).toBe(true);
  for (let tick = 0; tick < 20 * TICKS_PER_SECOND; tick++) traffic.step(clear);
  expect(traffic.agents.every((car) => car.junctionsPassed > 0)).toBe(true);
});
