import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { RailwayDetector } from '../../src/rules/detectors/MSC-01';
import { IntersectionManager } from '../../src/rules/priority/IntersectionManager';
import {
  TICKS_PER_SECOND,
  type EnvState,
  type RiderState,
} from '../../src/rules/types';
import {
  footprintReachesBox,
  footprintsOverlap,
} from '../../src/rules/world/Footprint';
import { railBlocksEntry, WorldModel } from '../../src/rules/world/WorldModel';
import { TrafficParticipants } from '../../src/sim/TrafficParticipants';
import { missionContent, runMissionRoute } from '../missions/run-mission-route';
import type { Waypoint } from '../missions/warsaw-routes';

const settings = missionContent.balans.silnik;
const world = new WorldModel(
  JSON.parse(readFileSync('maps/wies.tmj', 'utf8')),
  settings.kafel_m,
);
const day: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };
const dusk: EnvState = { ...day, time: 'dusk' };
const crossing = world.crossings.find(({ id }) => id === 'przejazd-gminny')!;
const routes: Record<string, Waypoint[]> = {
  'WIE-B-01': [
    { x: 1208, y: 552, maxInput: 0.42, answer: 0 },
    { x: 1208, y: 288, maxInput: 0.24 },
  ],
  'WIE-B-02': [
    { x: 1170, y: 1290, maxInput: 0.42, answer: 1 },
    { x: 1170, y: 1140, maxInput: 0.42 },
  ],
  'WIE-B-03': [{ x: 1012, y: 2106, maxInput: 0.42, answer: 1 }],
  'WIE-B-04': [
    { x: 942, y: 2240, maxInput: 0.3, answer: 1 },
    { x: 1016, y: 2240, maxInput: 0.3, signal: 'right' },
    { x: 1016, y: 2384, maxInput: 0.42, answer: 0 },
  ],
};

it.each(Object.entries(routes))(
  'completes %s by following the rules',
  (id, route) => {
    const { mission } = runMissionRoute(id, route);
    expect(
      mission.result,
      JSON.stringify(mission.result?.verdicts),
    ).toMatchObject({ status: 'completed' });
    expect(
      mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
    ).toEqual([]);
  },
);

it('warns about an approaching train at a passive crossing and rewards clearing it after stopping', () => {
  const rider: RiderState = {
    id: 'rider',
    pos: {
      x: crossing.x + crossing.width - 0.5,
      y: crossing.y + crossing.height + 1,
    },
    speed: 0,
    heading: -Math.PI / 2,
    mode: 'riding',
    signal: 'none',
    ageBand: '10to15',
    helmet: { worn: true, fastened: true },
  };
  const detector = new RailwayDetector(world);
  expect(world.railState(crossing, 20, day)).toEqual({
    barrier: 'open',
    flashing: false,
    trainApproaching: true,
  });
  expect(detector.evaluate(rider, [], 20, day)).toBeUndefined();
  rider.pos.y = crossing.y + crossing.height - 0.3;
  rider.speed = 2;
  expect(detector.evaluate(rider, [], 21, day)).toMatchObject({
    ruleId: 'MSC-01',
    kind: 'major',
  });

  const clearCrossing = new RailwayDetector(world);
  rider.pos.y = crossing.y + crossing.height + 1;
  rider.speed = 0;
  expect(clearCrossing.evaluate(rider, [], 30, day)).toBeUndefined();
  rider.pos.y = crossing.y + crossing.height - 0.3;
  rider.speed = 2;
  expect(clearCrossing.evaluate(rider, [], 31, day)).toBeUndefined();
  rider.pos.y = crossing.y - 0.1;
  expect(clearCrossing.evaluate(rider, [], 32, day)).toMatchObject({
    ruleId: 'MSC-01',
    kind: 'good',
  });
});

it.each([127, 17, 51])(
  'keeps traffic moving for ten simulated minutes (seed %i)',
  (seed) => {
    const traffic = new TrafficParticipants(
      world,
      new IntersectionManager(world),
      settings,
      seed,
      'ambient',
    );
    const { agents } = traffic.road;
    const lastPass = agents.map(() => ({ count: 0, tick: 0 }));
    const junctions = new Set<string>();
    const motorVehicles = [
      ...agents,
      ...traffic.routed.filter(
        ({ kind }) => kind === 'bus' || kind === 'tractor' || kind === 'tram',
      ),
    ];
    let maxRoadSpeed = 0;
    let busDwelled = false;
    for (let tick = 0; tick < 600 * TICKS_PER_SECOND; tick++) {
      const at = tick / TICKS_PER_SECOND;
      const env = at < world.duskAt ? day : dusk;
      traffic.step(env);
      const trainX = world.railTrainX(crossing, at);
      if (
        trainX !== undefined &&
        trainX > crossing.x - 2 &&
        trainX < crossing.x + crossing.width + 2
      ) {
        if (!railBlocksEntry(world.railState(crossing, at, env)))
          throw new Error('The train has no protected interval');
        if (agents.some((agent) => footprintReachesBox(agent, crossing)))
          throw new Error(`Vehicle still on the tracks at ${at}s`);
      }
      for (const [i, agent] of agents.entries()) {
        const last = lastPass[i]!;
        if (last.count !== agent.junctionsPassed) {
          last.count = agent.junctionsPassed;
          last.tick = tick;
        }
        const lane = agent.laneId && world.getLane(agent.laneId);
        if (lane) junctions.add(lane.intersection.id);
        if (lane && lane.speedLimit === 60)
          maxRoadSpeed = Math.max(maxRoadSpeed, agent.speed);
        if (tick - last.tick > 110 * TICKS_PER_SECOND)
          throw new Error(
            `${agent.id} stopped making progress at ${at}s (${agent.laneId})`,
          );
      }
      for (const [i, vehicle] of motorVehicles.entries()) {
        if ('active' in vehicle && !vehicle.active) continue;
        if (
          vehicle.kind === 'bus' &&
          vehicle.intent === 'boarding' &&
          vehicle.speed === 0
        )
          busDwelled = true;
        for (let j = i + 1; j < motorVehicles.length; j++) {
          const other = motorVehicles[j]!;
          if (
            (!('active' in other) || other.active) &&
            footprintsOverlap(vehicle, other)
          )
            throw new Error(
              `${vehicle.id} overlaps ${other.id} at ${at}s (${vehicle.laneId}, ${other.laneId})`,
            );
        }
      }
    }
    expect(junctions.size).toBe(world.intersections.length);
    expect(maxRoadSpeed).toBeGreaterThan(30 / 3.6);
    expect(busDwelled).toBe(true);
    expect(Math.min(...lastPass.map(({ count }) => count))).toBeGreaterThan(10);
    for (const actor of traffic.routed)
      expect(actor.trips, actor.id).toBeGreaterThan(2);
  },
);

it('withholds a pass when there is less than a metre of lateral clearance', () => {
  const fresh = () =>
    new TrafficParticipants(
      world,
      new IntersectionManager(world),
      settings,
      127,
      'ambient',
    );
  const ample = fresh();
  const narrow = fresh();
  const index = ample.road.agents.findIndex(
    (agent) => agent.laneId === 'gminna-osada-N',
  );
  expect(index).toBeGreaterThanOrEqual(0);
  const car = ample.road.agents[index]!;
  const following = narrow.road.agents[index]!;
  const cyclist: RiderState = {
    id: 'rider',
    pos: { x: car.pos.x - 2.6, y: car.pos.y + 8 },
    speed: 0,
    heading: car.heading,
    mode: 'riding',
    signal: 'none',
    ageBand: '10to15',
    helmet: { worn: true, fastened: true },
  };
  const tooClose = { ...cyclist, pos: { ...cyclist.pos, x: car.pos.x - 1.8 } };
  for (let tick = 0; tick < 5 * TICKS_PER_SECOND; tick++) {
    ample.step(day, cyclist);
    narrow.step(day, tooClose);
  }
  expect(car.pos.y).toBeGreaterThan(cyclist.pos.y + 3);
  expect(following.pos.y).toBeLessThan(tooClose.pos.y - 3);
  expect(following.speed).toBeLessThan(0.05);
});

it('fails the farm exercise when the rider enters the closed shortcut', () => {
  const { mission } = runMissionRoute('WIE-B-04', [
    routes['WIE-B-04']![0]!,
    { x: 942, y: 2320, maxInput: 0.24 },
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    timeBonus: 0,
    verdict: { ruleId: 'ZNAK-B1' },
  });
});
