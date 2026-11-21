import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse } from 'yaml';
import { IntersectionManager } from '../../src/rules/priority/IntersectionManager';
import {
  TICKS_PER_SECOND,
  type AgentState,
  type EnvState,
  type RiderState,
} from '../../src/rules/types';
import { contains, WorldModel } from '../../src/rules/world/WorldModel';
import {
  actorRadiusPx,
  TrafficParticipants,
  type RoutedAgent,
} from '../../src/sim/TrafficParticipants';
import { readContent } from '../../tools/content';

const settings = (await readContent()).balans.silnik;
const map = () =>
  JSON.parse(readFileSync('maps/miasteczko.tmj', 'utf8')) as {
    properties: { name: string; value: unknown }[];
    layers: {
      name: string;
      objects?: {
        name: string;
        properties: { name: string; value: unknown }[];
      }[];
    }[];
  };
const clear: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };

function simulate(
  seed?: number,
  edit?: (data: ReturnType<typeof map>) => void,
) {
  const data = map();
  edit?.(data);
  const world = new WorldModel(data, settings.kafel_m);
  const manager = new IntersectionManager(world);
  return {
    world,
    manager,
    sim: new TrafficParticipants(world, manager, settings, seed),
  };
}

function noRoadVehicles(data: ReturnType<typeof map>) {
  data.properties.find(({ name }) => name === 'trafficCars')!.value = 0;
  const spawns = data.layers.find(({ name }) => name === 'spawns')!;
  spawns.objects = spawns.objects!.filter(({ name }) => name === 'player');
}

function rider(
  world: WorldModel,
  x: number,
  y: number,
  heading: number,
): RiderState {
  return {
    id: 'player',
    pos: { x: x * world.metersPerPixel, y: y * world.metersPerPixel },
    heading: (heading * Math.PI) / 180,
    speed: 0,
    mode: 'riding',
    signal: 'none',
    ageBand: '10to15',
    helmet: { worn: true, fastened: true },
  };
}

interface Stage {
  seconds: number;
  player?: { x: number; y: number; heading: number };
  signalOverrides?: EnvState['signalOverrides'];
  expect: {
    xAbove?: number;
    xBelow?: number;
    stopped?: boolean;
    protective?: boolean;
    active?: boolean;
    signals?: boolean;
    trips?: number;
    intent?: RoutedAgent['intent'];
  };
}
const { scenarios } = parse(readFileSync('tests/sim/m3b.yaml', 'utf8')) as {
  scenarios: { name: string; actor: string; stages: Stage[] }[];
};

it.each(scenarios)('$name', ({ actor, stages }) => {
  const { world, sim } = simulate(undefined, noRoadVehicles);
  const agent = sim.routed.find(({ id }) => id === actor)!;
  for (const stage of stages) {
    const source = stage.player;
    const player = source && rider(world, source.x, source.y, source.heading);
    const env = { ...clear, signalOverrides: stage.signalOverrides };
    for (let tick = 0; tick < stage.seconds * TICKS_PER_SECOND; tick++)
      sim.step(env, player);
    const {
      xAbove,
      xBelow,
      stopped,
      protective,
      active,
      signals,
      trips,
      intent,
    } = stage.expect;
    const x = agent.pos.x / world.metersPerPixel;
    if (xAbove !== undefined) expect(x).toBeGreaterThan(xAbove);
    if (xBelow !== undefined) expect(x).toBeLessThan(xBelow);
    if (stopped !== undefined) expect(agent.speed === 0).toBe(stopped);
    if (protective !== undefined)
      expect(agent.protectiveBrake).toBe(protective);
    if (active !== undefined) expect(agent.active).toBe(active);
    if (signals !== undefined) expect(agent.signalActive).toBe(signals);
    if (trips !== undefined) expect(agent.trips).toBe(trips);
    if (intent !== undefined) expect(agent.intent).toBe(intent);
  }
});

function overlaps(a: AgentState, b: AgentState, scale: number) {
  // The body of the tram is long and narrow. Passengers step out through its side.
  if (b.kind === 'tram') return overlaps(b, a, scale);
  const x = (b.pos.x - a.pos.x) / scale;
  const y = (b.pos.y - a.pos.y) / scale;
  if (a.kind !== 'tram')
    return (
      Math.hypot(x, y) < actorRadiusPx[a.kind] + actorRadiusPx[b.kind] - 1e-6
    );
  const along = Math.abs(x * Math.cos(a.heading) + y * Math.sin(a.heading));
  const across = Math.abs(y * Math.cos(a.heading) - x * Math.sin(a.heading));
  return (
    Math.hypot(Math.max(0, along - 25), Math.max(0, across - 10)) <
    actorRadiusPx[b.kind] - 1e-6
  );
}

it.each([1403, 17])(
  'all participant types keep moving for ten minutes without collisions (seed %i)',
  (seed) => {
    const { sim, world } = simulate(seed);
    const stop = world.trafficRoutes.find(({ kind }) => kind === 'tram')!
      .stops[0]!;
    const passenger = sim.routed.find(({ id }) => id === stop.passenger.id)!;
    let emergencyYield = false;
    let stopYield = false;
    const progress = new Map<string, { x: number; y: number; tick: number }>();
    for (let tick = 0; tick < 600 * TICKS_PER_SECOND; tick++) {
      sim.step(clear);
      const agents = [
        ...sim.road.agents,
        ...sim.routed.filter(({ active }) => active),
      ];
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i]!;
        const last = progress.get(a.id);
        if (!last || Math.hypot(a.pos.x - last.x, a.pos.y - last.y) > 0.3)
          progress.set(a.id, { ...a.pos, tick });
        else if (tick - last.tick > 90 * TICKS_PER_SECOND)
          throw new Error(`${a.id} stationary for 90 seconds at tick ${tick}`);
        for (let j = i + 1; j < agents.length; j++) {
          const b = agents[j]!;
          if (overlaps(a, b, world.metersPerPixel))
            throw new Error(`${a.id} collided with ${b.id} at tick ${tick}`);
        }
      }
      for (const car of sim.road.agents) {
        if (
          car.intent === 'emergency' &&
          car.speed === 0 &&
          car.pos.y / world.metersPerPixel > 1440
        )
          emergencyYield = true;
        if (!passenger.active) continue;
        if (contains(stop, car.pos))
          throw new Error(`${car.id} entered the stop during alighting`);
        if (
          car.laneId === 'yield-W' &&
          car.speed === 0 &&
          car.intent === 'yield' &&
          Math.abs(stop.x - car.pos.x) < 2
        )
          stopYield = true;
      }
    }
    expect(
      sim.road.agents.every(({ junctionsPassed }) => junctionsPassed > 15),
    ).toBe(true);
    expect(sim.routed.every(({ trips }) => trips >= 5)).toBe(true);
    expect(emergencyYield).toBe(true);
    expect(stopYield).toBe(true);
  },
  20_000,
);

it('reproduces pedestrian, cycle, tram and emergency states after resetting', () => {
  const { sim } = simulate(1403);
  const record = () =>
    Array.from({ length: 12 }, () => {
      for (let tick = 0; tick < 240; tick++) sim.step(clear);
      return structuredClone([...sim.road.agents, ...sim.routed]);
    });
  const before = record();
  sim.reset();
  expect(record()).toEqual(before);
});

it('waits at a pedestrian red light and finishes an already started crossing', () => {
  const { sim, world } = simulate(undefined, noRoadVehicles);
  const walker = sim.routed.find(({ id }) => id === 'pedestrian-lights')!;
  const crossing = world.crossings.find(({ id }) => id === 'zebra-lights')!;
  const red: EnvState = { ...clear, signalOverrides: { [crossing.id]: 'red' } };
  const green: EnvState = {
    ...clear,
    signalOverrides: { [crossing.id]: 'green' },
  };
  for (let tick = 0; tick < 300; tick++) sim.step(red);
  expect(walker.speed).toBe(0);
  expect(walker.crossingId).toBeUndefined();
  expect(contains(crossing, walker.pos)).toBe(false);
  for (let tick = 0; tick < 100; tick++) sim.step(green);
  expect(walker.crossingId).toBe(crossing.id);
  expect(contains(crossing, walker.pos)).toBe(true);
  for (let tick = 0; tick < 600; tick++) sim.step(red);
  expect(walker.trips).toBe(1);
  expect(walker.crossingId).toBeUndefined();
  expect(contains(crossing, walker.pos)).toBe(false);
});

it('uses the sign and signal hierarchy before tram priority', () => {
  const { world, manager } = simulate(undefined, (data) => {
    const lane = data.layers
      .find(({ name }) => name === 'lanes')!
      .objects!.find(({ name }) => name === 'tram-yield-W')!;
    lane.properties.find(({ name }) => name === 'priorityClass')!.value =
      'minor';
  });
  const check = (
    name: string,
    pos: AgentState['pos'],
    overrides?: EnvState['signalOverrides'],
  ) => {
    const lane = world.getLane(name)!;
    const side = world.getLane(name.replace('tram-', '').replace('-W', '-N'))!;
    const tram: AgentState = {
      id: 'tram',
      kind: 'tram',
      pos: lane.end,
      speed: 5,
      heading: 0,
      laneId: name,
    };
    const car: AgentState = {
      id: 'car',
      kind: 'car',
      pos,
      speed: 4,
      heading: Math.PI / 2,
      laneId: side.id,
    };
    const env = { ...clear, signalOverrides: overrides };
    return {
      road: manager.mustYield(side, 'straight', tram, 0, env),
      tram: manager.mustYield(lane, 'straight', car, 0, env),
    };
  };
  expect(check('tram-equal-W', { x: 20, y: 22 })).toEqual({
    road: 'PIER-09',
    tram: undefined,
  });
  expect(
    check(
      'tram-lights-W',
      { x: 98, y: 22 },
      { 'tram-lights-W': 'red', 'lights-N': 'green' },
    ),
  ).toEqual({ road: undefined, tram: undefined });
  const tramLane = world.getLane('tram-yield-W')!;
  const roadLane = world.getLane('yield-N')!;
  // Model a signed main road crossing a subordinated rail approach.
  roadLane.priorityClass = 'main';
  expect(
    manager.mustYield(
      tramLane,
      'straight',
      {
        id: 'main',
        kind: 'car',
        laneId: roadLane.id,
        pos: roadLane.end,
        heading: Math.PI / 2,
        speed: 4,
      },
      0,
      clear,
    ),
  ).toBe('PIER-02');
});

it('rejects an AI road route where assigned cycle infrastructure exists', () => {
  expect(() =>
    simulate(undefined, (data) => {
      const lane = data.layers
        .find(({ name }) => name === 'lanes')!
        .objects!.find(({ name }) => name === 'equal-N')!;
      lane.properties.push({ name: 'parallelBikeInfra', value: 'ddr-west' });
    }),
  ).toThrow('Illegal roadway cyclist route: equal-N');
});

it('holds the bike lane cyclist at the bike signal and keeps roadway cyclists to the right', () => {
  const { world, sim } = simulate();
  const onBikeLane = sim.routed.find(({ id }) => id === 'cyclist-bike-lane')!;
  const onRoad = sim.road.agents.find(({ kind }) => kind === 'cyclist')!;
  const crossing = world.crossings.find(
    ({ id }) => id === 'cycle-lane-lights',
  )!;

  const roadLane = world.getLane(onRoad.laneId!)!;
  expect(roadLane.parallelBikeInfra).toBeUndefined();
  const right =
    (onRoad.pos.y - roadLane.end.y) * roadLane.forward.x -
    (onRoad.pos.x - roadLane.end.x) * roadLane.forward.y;
  expect(right).toBeGreaterThan(0);
  expect(right).toBeLessThan(roadLane.width / 2);

  const held: EnvState = {
    ...clear,
    signalOverrides: { [crossing.id]: 'red' },
  };
  for (let tick = 0; tick < 720; tick++) sim.step(held);
  expect(onBikeLane.intent).toBe('signal');
  expect(onBikeLane.speed).toBe(0);
  expect(onBikeLane.pos.x).toBeGreaterThan(crossing.x + crossing.width);
  expect(onBikeLane.heading).toBeCloseTo(Math.PI);
  const released: EnvState = {
    ...clear,
    signalOverrides: { [crossing.id]: 'green' },
  };
  let crossed = false;
  for (let tick = 0; tick < 600; tick++) {
    sim.step(released);
    crossed ||=
      onBikeLane.crossingId === crossing.id &&
      contains(crossing, onBikeLane.pos);
  }
  expect(crossed).toBe(true);
});
