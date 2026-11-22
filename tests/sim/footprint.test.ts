import { expect, it } from 'vitest';
import { overlaps } from '../../src/gameplay/bicycle';
import {
  createTrafficObstacles,
  placeTrafficObstacles,
} from '../../src/gameplay/trafficObstacles';
import { trafficFootprints } from '../../src/rules/world/Footprint';
import { RoadPath } from '../../src/rules/world/RoadPath';

it.each([1.5 / 32, 3 / 32])(
  'converts physical bodies using the current world scale (%s m/px)',
  (scale) => {
    const car = {
      id: 'car',
      kind: 'car' as const,
      pos: { x: 15, y: 15 },
      heading: Math.PI / 2,
      speed: 0,
    };
    const obstacles = createTrafficObstacles(car, scale);
    placeTrafficObstacles(obstacles, car, scale);
    const [body] = obstacles;
    expect(body!.width * scale).toBeCloseTo(4.5);
    expect(body!.height * scale).toBeCloseTo(1.8);
    expect(overlaps(15 / scale, 17.1 / scale, 0.03 / scale, body!)).toBe(true);
    expect(overlaps(16 / scale, 15 / scale, 0.03 / scale, body!)).toBe(false);
  },
);

it('places both tram segments around the joint at their own headings', () => {
  const tram = {
    id: 'tram',
    kind: 'tram' as const,
    pos: { x: 10, y: 10 },
    heading: 0,
    speed: 0,
    tramHeadings: { front: 0, rear: Math.PI / 2 },
  };
  const scale = 0.05;
  const obstacles = createTrafficObstacles(tram, scale);
  placeTrafficObstacles(obstacles, tram, scale);

  expect(obstacles.map(({ width }) => width * scale)).toEqual([7.5, 7.5]);
  expect(
    obstacles.some((body) => overlaps(16 / scale, 10 / scale, 1, body)),
  ).toBe(true);
  expect(
    obstacles.some((body) => overlaps(10 / scale, 4 / scale, 1, body)),
  ).toBe(true);
  expect(
    obstacles.some((body) => overlaps(4 / scale, 10 / scale, 1, body)),
  ).toBe(false);
});

it('tests the nose and lateral clearance independently when approaching a crossing', () => {
  const track = new RoadPath('tram', [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
  ]);
  const { tram } = trafficFootprints;
  expect(
    track.boxAhead(
      0,
      { id: 'crossing', x: 12, y: 1, width: 2, height: 1 },
      0,
      tram,
    ),
  ).toBeCloseTo(12 - tram.halfLength);
  expect(
    track.boxAhead(
      0,
      { id: 'crossing', x: 12, y: 1.25, width: 2, height: 1 },
      0,
      tram,
    ),
  ).toBe(Infinity);
  expect(track.obstacleAhead(16, { x: 12, y: 0 }, 0, tram)).toBe(Infinity);
});
