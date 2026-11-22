import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { TILE_COUNT } from '../src/render/artFrames';
import {
  MAX_FACTOR,
  projectionFactor,
  roofOffset,
} from '../src/render/projection';
it('roof projection follows camera position and height on integer pixels', () => {
  const b = { x: 100, y: 100, width: 100, height: 100, floors: 4 };
  expect(roofOffset(b, 150, 150)).toEqual({ x: 0, y: 0 });
  expect(roofOffset(b, 0, 0)).toEqual({ x: 7, y: 7 });
  expect(roofOffset({ ...b, floors: 8 }, 0, 0)).toEqual({ x: 13, y: 13 });
  expect(roofOffset(b, 300, 300)).toEqual({ x: -7, y: -7 });
  expect(roofOffset(b, 0, 0, true)).toEqual({ x: 0, y: -16 });
});
it('projection starts at zero, grows monotonically and caps tall buildings', () => {
  expect(projectionFactor(0)).toBe(0);
  expect(projectionFactor(10)).toBeCloseTo(120 / 1100);
  expect(projectionFactor(32)).toBeCloseTo(384 / 1100);
  expect(projectionFactor(40)).toBe(MAX_FACTOR);
  for (let floors = 1; floors <= 100; floors++) {
    expect(projectionFactor(floors)).toBeGreaterThanOrEqual(
      projectionFactor(floors - 1),
    );
    expect(projectionFactor(floors)).toBeLessThanOrEqual(MAX_FACTOR);
  }
  expect(projectionFactor(10, 600)).toBeGreaterThan(projectionFactor(10));
});

it('training Tiled map has complete tile layers, spawn and collision objects', () => {
  const map = JSON.parse(readFileSync('maps/miasteczko.tmj', 'utf8')) as {
    width: number;
    height: number;
    layers: {
      name: string;
      type: string;
      data?: number[];
      objects?: { name: string }[];
    }[];
  };
  expect([map.width, map.height]).toEqual([80, 60]);
  for (const layer of map.layers.filter((l) => l.type === 'tilelayer')) {
    expect(layer.data).toHaveLength(map.width * map.height);
    expect(layer.data!.every((t) => t >= 0 && t <= TILE_COUNT)).toBe(true);
  }
  expect(
    map.layers
      .find((l) => l.name === 'spawns')
      ?.objects?.some((o) => o.name === 'player'),
  ).toBe(true);
  expect(
    map.layers.find((l) => l.name === 'collisions')?.objects?.length,
  ).toBeGreaterThan(0);
  expect(
    map.layers.find((l) => l.name === 'blocks')?.objects?.length,
  ).toBeGreaterThan(0);
});

it('test palace has five nested tiers with increasing height', () => {
  const map = JSON.parse(readFileSync('maps/miasteczko.tmj', 'utf8')) as {
    layers: {
      name: string;
      objects?: {
        name: string;
        width: number;
        properties: { name: string; value: unknown }[];
      }[];
    }[];
  };
  const tiers = map.layers
    .find((l) => l.name === 'blocks')!
    .objects!.filter((o) => o.name.startsWith('palace-tier-'));
  expect(
    tiers.map((t) => t.properties.find((p) => p.name === 'height')!.value),
  ).toEqual([4, 10, 18, 26, 32]);
  expect(tiers.map((t) => t.width)).toEqual([192, 128, 80, 40, 8]);
});
