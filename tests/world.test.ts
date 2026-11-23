import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { TILE_COUNT } from '../src/render/artFrames';
import { pixelScroll } from '../src/render/pixelCamera';
import {
  MAX_FACTOR,
  MIN_CAMERA_HEIGHT_PX,
  blockOpacity,
  blockRoadBounds,
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

it('pans on canvas pixels through a chunk boundary at fractional camera zoom', () => {
  const zoom = 0.75;
  const viewport = 641;
  const mapSize = 4992;
  const offset = Math.round(viewport / 2) - (viewport / 2) * zoom;
  const boundary = 7 * 512;
  const project = (worldX: number, scroll: number) =>
    offset + (worldX - pixelScroll(scroll, viewport, zoom, mapSize)) * zoom;
  const frames = [3259, 3259.5, 3260, 3260.5, 3261, 3262].map((scroll) =>
    project(boundary, scroll),
  );
  for (const frame of frames) {
    const distance = frame - frames[0]!;
    expect(distance).toBeCloseTo(Math.round(distance), 8);
  }
  expect(frames[0]! - frames.at(-1)!).toBeCloseTo(2, 8);
  expect(Math.round(project(0, 0))).toBe(0);
  expect(Math.round(project(mapSize, mapSize))).toBeGreaterThanOrEqual(
    viewport,
  );
});

it('fades a projected building gradually when it hides a nearby road', () => {
  const silhouette = { left: 0, top: 0, right: 90, bottom: 128 };
  const road = { left: 64, top: 0, right: 128, bottom: 300 };
  expect(blockOpacity(112, 300, silhouette, [road])).toBe(1);
  expect(blockOpacity(112, 160, silhouette, [])).toBeGreaterThan(0.8);
  const approach = blockOpacity(112, 240, silhouette, [road]);
  expect(approach).toBeLessThan(1);
  expect(blockOpacity(112, 160, silhouette, [road])).toBeCloseTo(0.28);
  expect(blockOpacity(112, 160, silhouette, [road])).toBeLessThan(approach);
  expect(blockOpacity(48, 64, silhouette, [])).toBeCloseTo(0.28);
  for (let y = 129; y <= 300; y++) {
    const step = ((1 - blockOpacity(112, y, silhouette, [road])) / 0.72) * 16;
    expect(step).toBeCloseTo(Math.round(step), 10);
  }
});

it('bounds road candidates for both tiers at the projection extremes', () => {
  const block = { x: 320, y: 264, width: 24, height: 24, floors: 32 };
  const support = { x: 280, y: 224, width: 64, height: 64, floors: 12 };
  const bounds = blockRoadBounds(block, support, 800, 600);
  for (const [cx, cy] of [
    [0, 0],
    [800, 600],
  ] as const) {
    for (const lite of [true, false]) {
      for (const tier of [block, support]) {
        const { x, y } = roofOffset(
          tier,
          cx,
          cy,
          lite,
          MIN_CAMERA_HEIGHT_PX,
          undefined,
          0.75,
        );
        expect(block.x + x).toBeGreaterThan(bounds.left);
        expect(block.x + block.width + x).toBeLessThan(bounds.right);
        expect(block.y + y).toBeGreaterThan(bounds.top);
        expect(block.y + block.height + y).toBeLessThan(bounds.bottom);
      }
    }
  }
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
