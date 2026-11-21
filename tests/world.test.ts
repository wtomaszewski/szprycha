import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { roofOffset } from '../src/render/projection';
it('roof projection follows camera position and height on integer pixels', () => {
  const b = { x: 100, y: 100, width: 100, height: 100, floors: 4 };
  expect(roofOffset(b, 150, 150)).toEqual({ x: 0, y: 0 });
  expect(roofOffset(b, 0, 0)).toEqual({ x: 9, y: 9 });
  expect(roofOffset({ ...b, floors: 8 }, 0, 0)).toEqual({ x: 18, y: 18 });
  expect(roofOffset(b, 300, 300)).toEqual({ x: -9, y: -9 });
  expect(roofOffset(b, 0, 0, true)).toEqual({ x: 0, y: -16 });
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
    expect(layer.data!.every((t) => t >= 0 && t <= 8)).toBe(true);
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
