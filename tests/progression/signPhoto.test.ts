import { expect, it } from 'vitest';
import { nearbyPhotoSubject } from '../../src/gameplay/signPhoto';
import type { WorldModel } from '../../src/rules/world/WorldModel';

type PhotoWorld = Parameters<typeof nearbyPhotoSubject>[0];
const sidewalk: PhotoWorld['zones'][number] = {
  id: 'sidewalk',
  kind: 'sidewalk',
  x: 0,
  y: 0,
  width: 30,
  height: 2,
};
const road: PhotoWorld['zones'][number] = {
  id: 'road',
  kind: 'roadway',
  x: 0,
  y: 2,
  width: 30,
  height: 6,
};
const crossing: PhotoWorld['crossings'][number] = {
  id: 'crossing',
  kind: 'pedestrian',
  axis: 'y',
  x: 14,
  y: 1,
  width: 2,
  height: 7,
};
const sign: WorldModel['signs'][number] = {
  id: 'stop',
  code: 'B-20',
  affects: 'road',
  facing: 'N',
  exceptBicycles: false,
  x: 10,
  y: 2,
};
const displayOnly = {
  ...sign,
  id: 'moved',
  code: 'A-7',
  displayOnly: true,
  x: 9,
};
const unknown = { ...sign, id: 'unknown', code: 'D-47', x: 8 };
const world: PhotoWorld = {
  zones: [road, sidewalk],
  crossings: [crossing],
  signs: [displayOnly, sign, unknown],
  signals: [],
};
const known = new Map([
  ['B-20', true],
  ['A-7', true],
]);

it('allows a nearby catalog sign from a safe and stationary walking position', () => {
  expect(nearbyPhotoSubject(world, { x: 8, y: 1 }, 0, true, known, {}, 6)).toBe(
    sign,
  );
});

it.each([
  [{ x: 8, y: 1 }, 1, true, {}],
  [{ x: 8, y: 1 }, 0, false, {}],
  [{ x: 8, y: 3 }, 0, true, {}],
  [{ x: 15, y: 1 }, 0, true, {}],
  [{ x: 18, y: 1 }, 0, true, {}],
  [{ x: 8, y: 1 }, 0, true, { 'B-20': 'photo' }],
] as const)(
  'declines an ineligible photo at %j',
  (position, speed, walking, collected) => {
    expect(
      nearbyPhotoSubject(world, position, speed, walking, known, collected, 6),
    ).toBeUndefined();
  },
);
