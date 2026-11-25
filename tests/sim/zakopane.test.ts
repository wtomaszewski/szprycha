import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { FIXED_STEP, stepRider } from '../../src/gameplay/bicycle';
import { IntersectionManager } from '../../src/rules/priority/IntersectionManager';
import { RuleEngine } from '../../src/rules/RuleEngine';
import {
  TICKS_PER_SECOND,
  type EnvState,
  type RiderState,
} from '../../src/rules/types';
import { footprintsOverlap } from '../../src/rules/world/Footprint';
import {
  gradeAcceleration,
  stoppingDistance,
} from '../../src/rules/world/RoadGrade';
import { WorldModel } from '../../src/rules/world/WorldModel';
import { TrafficParticipants } from '../../src/sim/TrafficParticipants';
import { missionContent, runMissionRoute } from '../missions/run-mission-route';
import type { Waypoint } from '../missions/warsaw-routes';

const settings = missionContent.balans.silnik;
const map: unknown = JSON.parse(readFileSync('maps/zakopane.tmj', 'utf8'));
const world = new WorldModel(map, settings.kafel_m);
const scale = world.metersPerPixel;
const day: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };
const dusk: EnvState = { ...day, time: 'dusk' };
const south = Math.PI / 2;
const north = -south;

it('uses directional grade to accelerate, climb and brake deterministically', () => {
  function ride(heading: number, graded = true, walking = false) {
    const rider = { x: 3968, y: 1800, heading, speed: 0, walking };
    const tuning = graded ? { world } : undefined;
    const input = { x: 0, y: -1, scheme: 'classic', brake: false } as const;
    for (let i = 0; i < 60; i++)
      stepRider(rider, input, [], 4864, 3584, FIXED_STEP, tuning);
    const { speed, y } = rider;
    for (let i = 0; i < 120 && rider.speed > 0; i++)
      stepRider(
        rider,
        { ...input, brake: true },
        [],
        4864,
        3584,
        FIXED_STEP,
        tuning,
      );
    expect(rider.speed).toBe(0);
    return { speed, braking: Math.abs(rider.y - y) };
  }

  const flat = ride(south, false);
  const downhill = ride(south);
  const uphill = ride(north);
  expect(downhill).toEqual(ride(south));
  expect(downhill.speed).toBeGreaterThan(flat.speed);
  expect(uphill.speed).toBeLessThan(flat.speed);
  expect(ride(south, true, true)).toEqual(ride(south, false, true));

  function brakeFromSameSpeed(heading: number, graded: boolean) {
    const rider = { x: 3968, y: 1800, heading, speed: 95, walking: false };
    for (let i = 0; i < 120 && rider.speed > 0; i++)
      stepRider(
        rider,
        { x: 0, y: 0, scheme: 'classic', brake: true },
        [],
        4864,
        3584,
        FIXED_STEP,
        graded ? { world } : undefined,
      );
    return Math.abs(rider.y - 1800);
  }

  expect(brakeFromSameSpeed(south, true)).toBeGreaterThan(
    brakeFromSameSpeed(south, false),
  );
  expect(brakeFromSameSpeed(north, true)).toBeLessThan(
    brakeFromSameSpeed(north, false),
  );
  const grade = world.roadGradeAt(3968 * scale, 1800 * scale)!;
  expect(gradeAcceleration(grade, 0)).toBe(0);
  expect(world.roadGradeAt(3880 * scale, 1800 * scale)).toBeUndefined();
  expect(
    stoppingDistance(4, scale, 1, gradeAcceleration(grade, south)),
  ).toBeGreaterThan(stoppingDistance(4, scale, 1, 0));
});

it('accelerates a coasting bicycle downhill and holds it stationary after braking', () => {
  const rider = { x: 3968, y: 1800, heading: south, speed: 15, walking: false };
  const input = { x: 0, y: 0, scheme: 'classic', brake: false } as const;
  const tuning = { world };
  for (let i = 0; i < 60; i++)
    stepRider(rider, input, [], 4864, 3584, FIXED_STEP, tuning);
  expect(rider.speed).toBeGreaterThan(15);
  while (rider.speed > 0)
    stepRider(
      rider,
      { ...input, brake: true },
      [],
      4864,
      3584,
      FIXED_STEP,
      tuning,
    );
  stepRider(rider, input, [], 4864, 3584, FIXED_STEP, tuning);
  expect(rider.speed).toBe(0);
});

it('requires less speed in fog and reports sustained unsafe speed once per descent', () => {
  const rider: RiderState = {
    id: 'player',
    pos: { x: 3968 * scale, y: 1800 * scale },
    heading: south,
    speed: 5,
    mode: 'riding',
    signal: 'none',
    ageBand: '10to15',
    helmet: { worn: true, fastened: true },
    lights: { front: true, rear: true },
  };
  const engine = new RuleEngine(world, missionContent);
  const rules: string[] = [];
  engine.onVerdict(({ kind, ruleId }) => {
    if (kind !== 'good') rules.push(ruleId);
  });
  engine.step(rider, [], day);
  expect(rules).toEqual([]);
  const fog: EnvState = { ...day, weather: 'fog' };
  for (let tick = 0; tick < 60; tick++) engine.step(rider, [], fog);
  expect(rules).toEqual(['MAN-08']);
});

const routes: Record<string, Waypoint[]> = {
  'ZAK-B-01': [
    { x: 3968, y: 1778, maxInput: 0.55, answer: 1 },
    { x: 3968, y: 2160, maxInput: 0.55 },
  ],
  'ZAK-B-02': [
    { x: 1104, y: 3392, answer: 0 },
    { x: 1104, y: 3286 },
  ],
  'ZAK-B-03': [{ x: 3968, y: 2130, maxInput: 0.4, answer: 1 }],
  'ZAK-B-04': [
    { x: 1528, y: 854, maxInput: 0.45, answer: 1 },
    { x: 2072, y: 856, maxInput: 0.45 },
  ],
  'ZAK-B-05': [
    { x: 1936, y: 994, maxInput: 0.4, answer: 0 },
    { x: 1936, y: 2078, maxInput: 0.4, answer: 1 },
  ],
};

it.each(Object.entries(routes))(
  'completes %s safely without a time bonus',
  (id, points) => {
    const { mission, rider, target } = runMissionRoute(id, points);
    expect(
      mission.result,
      JSON.stringify({ target, rider, result: mission.result }),
    ).toMatchObject({
      status: 'completed',
      timeBonus: 0,
      timeBonusEligible: false,
    });
    expect(
      mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
    ).toEqual([]);
  },
);

it.each([
  ['ZAK-B-01', [{ x: 3968, y: 1778 }], 'MAN-08'],
  [
    'ZAK-B-02',
    [
      { x: 1055, y: 3455 },
      { x: 1055, y: 3286 },
    ],
    'GDZIE-03b',
  ],
  ['ZAK-B-04', [routes['ZAK-B-04']![0]!, { x: 1528, y: 750 }], 'ZNAK-B1'],
] as const)('fails %s when the rider breaks %s', (id, points, ruleId) => {
  const { mission } = runMissionRoute(id, points);
  expect(mission.result).toMatchObject({
    status: 'failed',
    verdict: { ruleId },
    points: 0,
    timeBonus: 0,
  });
});

it.each([1403, 17, 51])(
  'keeps traffic moving for ten minutes (seed %i)',
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
      Math.min(...cars.map(({ junctionsPassed }) => junctionsPassed)),
    ).toBeGreaterThan(10);
    for (const { id, trips } of traffic.routed)
      expect(trips, id).toBeGreaterThan(2);
  },
);
