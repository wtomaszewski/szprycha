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
type TiledObject = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: { name: string; value: unknown }[];
};
const map = JSON.parse(readFileSync('maps/wroclaw.tmj', 'utf8')) as {
  layers: { name: string; objects?: TiledObject[] }[];
};
const world = new WorldModel(map, settings.kafel_m);
const day: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };
const night: EnvState = { ...day, time: 'dusk' };

it('covers all 13 situations and contains the complete gnome collection', () => {
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

  const gnomes = map.layers.find(
    ({ name }) => name === 'collectibles',
  )!.objects!;
  expect(new Set(gnomes.map(({ name }) => name)).size).toBe(100);
  expect(
    gnomes.filter(({ properties }) =>
      properties.some(
        ({ name, value }) => name === 'district' && value === 'rynek',
      ),
    ),
  ).toHaveLength(30);
  const obstacles = map.layers
    .filter(({ name }) => name === 'collisions' || name === 'blocks')
    .flatMap(({ objects }) => objects!);
  for (const { name, x, y } of gnomes)
    expect(
      obstacles.some(
        (box) =>
          x >= box.x &&
          x < box.x + box.width &&
          y >= box.y &&
          y < box.y + box.height,
      ),
      name,
    ).toBe(false);
});

it('sets a safe crossing phase and distinguishes both rail crossings', () => {
  const bicycle = world.crossings.find(({ id }) => id === 'poludnie-przejazd')!;
  expect(world.phase(world.getLane('poludnie-N')!, 9, day)).toBe('arrow');
  expect(world.crossingPhase(bicycle, 0, day)).toBe('red');
  expect(world.crossingPhase(bicycle, 47, day)).toBe('green');
  for (const side of ['N', 'S', 'E', 'W']) {
    const open = side === 'E' || side === 'W';
    expect(world.phase(world.getLane(`poludnie-${side}`)!, 47, day)).toBe(
      open ? 'green' : 'red',
    );
  }

  expect(
    world.crossings
      .filter(({ kind }) => kind === 'rail')
      .map(({ rail }) => rail?.barriers),
  ).toEqual([true, false]);
  expect(world.duskAt).toBe(90);
  const bridgeLane = world.getLane('rynek-N')!;
  const bridgeBikePath = world.zones.find(
    ({ id }) => id === bridgeLane.parallelBikeInfra,
  )!;
  expect(bridgeBikePath.kind).toBe('bike_path');
  expect(bridgeBikePath.x + bridgeBikePath.width).toBeLessThan(
    bridgeLane.end.x,
  );
  expect(world.getLane('dworzec-W')?.parallelBikeInfra).toBe(
    'pas-rowerowy-poludnie',
  );
});

it.each([1403, 17, 51])(
  'runs ten simulated minutes across the connected city without deadlocks (seed %s)',
  (seed) => {
    const traffic = new TrafficParticipants(
      world,
      new IntersectionManager(world),
      settings,
      seed,
    );
    const vehicles = traffic.road.agents;
    const roadUsers = traffic.routed.filter(
      ({ kind }) => kind === 'tram' || kind === 'cyclist',
    );
    const passed = vehicles.map(() => ({ tick: 0, junctions: 0 }));
    const traversed = new Set<string>();
    expect(vehicles.filter(({ kind }) => kind === 'car')).toHaveLength(
      world.trafficCarCount,
    );
    for (let tick = 0; tick < 600 * TICKS_PER_SECOND; tick++) {
      traffic.step(tick >= world.duskAt * TICKS_PER_SECOND ? night : day);
      for (const [i, car] of vehicles.entries()) {
        const progress = passed[i]!;
        if (car.junctionsPassed !== progress.junctions) {
          progress.tick = tick;
          progress.junctions = car.junctionsPassed;
        }
        if (car.laneId)
          traversed.add(world.getLane(car.laneId)!.intersection.id);
        if (tick - progress.tick > 100 * TICKS_PER_SECOND)
          throw new Error(
            `${car.id} stopped clearing junctions at ${tick / TICKS_PER_SECOND}s (${car.laneId})`,
          );
        for (const other of roadUsers)
          if (other.active && footprintsOverlap(car, other))
            throw new Error(
              `${car.id} overlapped ${other.id} at ${tick / TICKS_PER_SECOND}s (${car.laneId}, ${JSON.stringify(car.pos)} vs ${JSON.stringify(other.pos)})`,
            );
        for (let j = i + 1; j < vehicles.length; j++)
          if (footprintsOverlap(car, vehicles[j]!))
            throw new Error(
              `${car.id} overlapped ${vehicles[j]!.id} at ${tick / TICKS_PER_SECOND}s`,
            );
      }
    }
    expect(traversed.size).toBe(world.intersections.length);
    expect(
      Math.min(...passed.map(({ junctions }) => junctions)),
    ).toBeGreaterThan(10);
    for (const participant of traffic.routed) {
      const route = world.trafficRoutes.find(({ id }) => id === participant.id);
      if (route?.event_only) expect(participant.trips, participant.id).toBe(0);
      else expect(participant.trips, participant.id).toBeGreaterThan(2);
    }
  },
);
