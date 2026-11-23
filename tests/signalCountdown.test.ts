import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EnvState } from '../src/rules/types';
import { WorldModel } from '../src/rules/world/WorldModel';

const world = new WorldModel(
  JSON.parse(readFileSync('maps/miasteczko.tmj', 'utf8')),
  1.5,
);
const env: EnvState = { time: 'day', weather: 'clear', visibilityLow: false };
const lane = world.getLane('lights-S')!;

describe('signal countdowns', () => {
  it.each([
    [0, 'green', 7, undefined],
    [6.99, 'green', 1, undefined],
    [7, 'yellow', 2, undefined],
    [8.99, 'yellow', 1, undefined],
    [9, 'red', 11, undefined],
    [12.99, 'red', 8, undefined],
    [13, 'arrow', 7, 3],
    [15.99, 'arrow', 5, 1],
    [16, 'red', 4, undefined],
    [19.99, 'red', 1, undefined],
    [20, 'green', 7, undefined],
  ])('keeps S-1 and S-2 in phase at %ss', (at, phase, main, arrow) => {
    expect(world.phase(lane, at, env)).toBe(phase);
    expect(world.signalCountdown(lane, 'S-1', at, env)).toBe(main);
    expect(world.signalCountdown(lane, 'S-2', at, env)).toBe(arrow);
  });

  it.each([
    ['cycle-lane-lights', 10, 5, 15],
    ['zebra-lights', 2, 3.5, 16.5],
  ])('follows the offset and cycle of %s', (id, greenAt, greenFor, redFor) => {
    const crossing = world.crossings.find((entry) => entry.id === id)!;
    const redAt = greenAt + greenFor;
    for (const [at, phase, seconds] of [
      [greenAt - 0.01, 'red', 1],
      [greenAt, 'green', Math.ceil(greenFor)],
      [redAt - 0.01, 'green', 1],
      [redAt, 'red', Math.ceil(redFor)],
      [greenAt + 20, 'green', Math.ceil(greenFor)],
    ] as const) {
      expect(world.crossingPhase(crossing, at, env)).toBe(phase);
      expect(world.crossingCountdown(crossing, at, env)).toBe(seconds);
    }
  });

  it('suppresses countdowns for overrides, unsignalled crossings and trams', () => {
    const crossing = world.crossings.find(({ id }) => id === 'zebra-lights')!;
    const overrides: EnvState = {
      ...env,
      signalOverrides: { 'lights-S': 'arrow', 'zebra-lights': 'off' },
    };
    expect(world.signalCountdown(lane, 'S-1', 13, overrides)).toBeUndefined();
    expect(world.signalCountdown(lane, 'S-2', 13, overrides)).toBeUndefined();
    expect(world.crossingCountdown(crossing, 13, overrides)).toBeUndefined();
    const unsignalled = world.crossings.find(({ signal }) => !signal)!;
    expect(world.crossingCountdown(unsignalled, 13, env)).toBeUndefined();
    const tram = world.getLane('tram-lights-W')!;
    expect(world.signalCountdown(tram, 'S-1', 13, env)).toBeUndefined();
  });
});
