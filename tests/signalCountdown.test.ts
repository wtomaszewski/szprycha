import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EnvState } from '../src/rules/types';
import { WorldModel } from '../src/rules/world/WorldModel';

const world = new WorldModel(
  JSON.parse(readFileSync('maps/miasteczko.tmj', 'utf8')),
  1.5,
);
const env: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };
const main = world.getLane('lights-W')!;
const side = world.getLane('lights-S')!;
const worldTime = (cycleTime: number) =>
  cycleTime + main.mainSignal!.cycle_s - main.mainSignal!.offset_s;

describe('signal countdowns', () => {
  it.each([
    [0, 'green', 15],
    [14.99, 'green', 1],
    [15, 'yellow', 2],
    [16.99, 'yellow', 1],
    [17, 'red', 8],
    [24.24, 'red', 1],
    [24.25, 'red-yellow', 1],
    [25, 'green', 15],
  ])('counts down the main roadway phase at %ss', (at, phase, seconds) => {
    expect(world.phase(main, worldTime(at), env)).toBe(phase);
    expect(world.signalCountdown(main, 'S-1', worldTime(at), env)).toBe(
      seconds,
    );
  });

  it.each([
    [0.99, 'red', 18, undefined],
    [1, 'arrow', 17, 7],
    [7.99, 'arrow', 11, 1],
    [8, 'red', 10, undefined],
    [17.25, 'red-yellow', 1, undefined],
    [18, 'green', 4, undefined],
    [22, 'yellow', 2, undefined],
    [24, 'red', 19, undefined],
  ])(
    'counts down S-2 separately from its red lamp at %ss',
    (at, phase, red, arrow) => {
      expect(world.phase(side, worldTime(at), env)).toBe(phase);
      expect(world.signalCountdown(side, 'S-1', worldTime(at), env)).toBe(red);
      expect(world.signalCountdown(side, 'S-2', worldTime(at), env)).toBe(
        arrow,
      );
    },
  );

  it.each([
    ['cycle-lane-lights', 0, 'green', 15],
    ['cycle-lane-lights', 15, 'flashing-green', 2],
    ['cycle-lane-lights', 17, 'red', 8],
    ['cycle-lane-lights', 24.99, 'red', 1],
    ['cycle-lane-lights', 25, 'green', 15],
    ['zebra-lights', 17, 'red', 1],
    ['zebra-lights', 17.25, 'green', 2],
    ['zebra-lights', 19.25, 'flashing-green', 5],
    ['zebra-lights', 24, 'red', 19],
  ])('counts down %s at %ss', (id, at, phase, seconds) => {
    const crossing = world.crossings.find((entry) => entry.id === id)!;
    expect(world.crossingPhase(crossing, worldTime(at), env)).toBe(phase);
    expect(world.crossingCountdown(crossing, worldTime(at), env)).toBe(seconds);
  });

  it('suppresses countdowns for overrides, unsignalled crossings and trams', () => {
    const crossing = world.crossings.find(({ id }) => id === 'zebra-lights')!;
    const overrides: EnvState = {
      ...env,
      signalOverrides: { 'lights-S': 'arrow', 'zebra-lights': 'off' },
    };
    expect(world.signalCountdown(side, 'S-1', 13, overrides)).toBeUndefined();
    expect(world.signalCountdown(side, 'S-2', 13, overrides)).toBeUndefined();
    expect(world.crossingCountdown(crossing, 13, overrides)).toBeUndefined();
    const unsignalled = world.crossings.find(({ signal }) => !signal)!;
    expect(world.crossingCountdown(unsignalled, 13, env)).toBeUndefined();
    const tram = world.getLane('tram-lights-W')!;
    expect(world.signalCountdown(tram, 'S-1', 13, env)).toBeUndefined();
  });
});

it.each([
  'miasteczko',
  'warszawa',
  'wroclaw',
  'krakow',
  'gdansk',
  'wies',
  'poznan',
])('keeps conflicting groups apart throughout the cycle in %s', (name) => {
  const map = new WorldModel(
    JSON.parse(readFileSync(`maps/${name}.tmj`, 'utf8')),
    1.5,
  );
  for (const junction of map.intersections) {
    const lanes = junction.lanes.filter(({ mainSignal }) => mainSignal);
    if (!lanes.length) continue;
    const cycle = lanes[0]!.mainSignal!.cycle_s;
    for (const { mainSignal } of lanes) {
      expect(mainSignal!.cycle_s).toBe(cycle);
      expect(mainSignal!.yellow_s).toBe(2);
      expect([15, 4]).toContain(mainSignal!.green_s);
      if (mainSignal!.green_s === 15)
        expect(cycle - mainSignal!.green_s - mainSignal!.yellow_s).toBe(8);
    }
    for (let at = 0; at < cycle; at += 0.25) {
      const openGroups = new Set(
        lanes
          .filter((lane) =>
            ['green', 'yellow'].includes(map.phase(lane, at, env)),
          )
          .map(({ mainSignal }) => mainSignal!.group),
      );
      expect(openGroups.size, `${junction.id} at ${at}s`).toBeLessThanOrEqual(
        1,
      );
    }
  }
  for (const { kind, signal } of map.crossings) {
    if (!signal || (kind === 'pedestrian' && signal.green_s < 15)) continue;
    expect(signal.green_s).toBe(15);
    expect(signal.cycle_s - signal.green_s - signal.flashing_s).toBe(8);
  }
});
