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
  JSON.parse(readFileSync('maps/krakow.tmj', 'utf8')),
  settings.kafel_m,
);
const day: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };
const dusk: EnvState = { ...day, time: 'dusk' };

it('covers every situation and module through geometry and playable exercises', () => {
  const practice = missionContent.misje.filter(
    ({ miasto, akt }) => miasto === 'krakow' && akt > 0,
  );
  const { situations, modules } = analyseMapCoverage(
    world,
    practice,
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
    ['rynek', undefined],
    ['wawel', 'KRA-B-01'],
    ['kazimierz', 'KRA-B-01'],
    ['bulwary', 'KRA-B-02'],
    ['kopiec', 'KRA-B-03'],
  ]);
  const crossing = world.crossings.find(({ id }) => id === 'aleja-przejazd')!;
  expect(world.crossingPhase(crossing, 8, day)).toBe('red');
  expect(world.crossingPhase(crossing, 16, day)).toBe('green');
  for (const side of ['E', 'W'])
    expect(world.phase(world.getLane(`aleja-${side}`)!, 16, day)).toBe('red');
});

it.each([1403, 17, 51])(
  'clears every junction within ten simulated minutes (seed %i)',
  (seed) => {
    const traffic = new TrafficParticipants(
      world,
      new IntersectionManager(world),
      settings,
      seed,
      'ambient',
    );
    const vehicles = traffic.road.agents;
    const trams = traffic.routed.filter(({ kind }) => kind === 'tram');
    const otherVehicles = [...vehicles, ...trams];
    const lastPass = vehicles.map(() => ({ tick: 0, count: 0 }));
    const junctions = new Set<string>();
    for (let tick = 0; tick < 600 * TICKS_PER_SECOND; tick++) {
      traffic.step(tick >= world.duskAt * TICKS_PER_SECOND ? dusk : day);
      for (const [i, agent] of vehicles.entries()) {
        const last = lastPass[i]!;
        if (last.count !== agent.junctionsPassed) {
          last.tick = tick;
          last.count = agent.junctionsPassed;
        }
        if (agent.laneId)
          junctions.add(world.getLane(agent.laneId)!.intersection.id);
        if (tick - last.tick > 105 * TICKS_PER_SECOND)
          throw new Error(
            `${agent.id} stalled at ${agent.laneId} (${tick / TICKS_PER_SECOND}s)`,
          );
        for (let j = i + 1; j < otherVehicles.length; j++) {
          const other = otherVehicles[j]!;
          if (
            (!('active' in other) || other.active) &&
            footprintsOverlap(agent, other)
          )
            throw new Error(
              `${agent.id} overlaps ${other.id} (${tick / TICKS_PER_SECOND}s, ${agent.laneId})`,
            );
        }
      }
    }
    expect(junctions.size).toBe(world.intersections.length);
    expect(Math.min(...lastPass.map(({ count }) => count))).toBeGreaterThan(10);
    for (const participant of traffic.routed) {
      const route = world.trafficRoutes.find(({ id }) => id === participant.id);
      if (route?.event_only) expect(participant.trips, participant.id).toBe(0);
      else expect(participant.trips, participant.id).toBeGreaterThan(2);
    }
  },
);

const routes: Record<string, Waypoint[]> = {
  'KRA-B-01': [
    { x: 1440, y: 635, walking: true },
    { x: 1640, y: 635 },
    { x: 1640, y: 768 },
    { x: 1796, y: 768 },
  ],
  'KRA-B-02': [
    { x: 3152, y: 1395, maxInput: 0.42 },
    { x: 3152, y: 1180, maxInput: 0.42, signal: 'left' },
    { x: 2784, y: 1180, maxInput: 0.42, answer: 1 },
    { x: 2784, y: 1162, crossingGreen: 'aleja-przejazd' },
    { x: 2784, y: 900 },
  ],
  'KRA-B-03': [
    { x: 2930, y: 2223, walking: true, answer: 0 },
    { x: 3244, y: 2223 },
  ],
};

it.each(Object.entries(routes))(
  'completes %s without violations',
  (id, points) => {
    const { mission } = runMissionRoute(id, points);
    expect(
      mission.result,
      JSON.stringify(mission.result?.verdicts),
    ).toMatchObject({ status: 'completed' });
    expect(
      mission.result?.verdicts.filter(({ kind }) => kind !== 'good'),
    ).toEqual([]);
  },
);

it('fails the Rynek exercise if the player rides through the B-9 entrance', () => {
  const { mission } = runMissionRoute('KRA-B-01', [
    { x: 1440, y: 636, maxInput: 0.3 },
  ]);
  expect(mission.result).toMatchObject({
    status: 'failed',
    verdict: { ruleId: 'ZNAK-B9' },
  });
});

it('fails the Kazimierz exercise if the rider enters P-11 on red', () => {
  const early = routes['KRA-B-02']!.map(({ crossingGreen, ...point }) => ({
    ...point,
    crossingRed: crossingGreen,
  }));
  const { mission } = runMissionRoute('KRA-B-02', early);
  expect(mission.result).toMatchObject({
    status: 'failed',
    timeBonus: 0,
    verdict: { ruleId: 'SYG-02' },
  });
});
