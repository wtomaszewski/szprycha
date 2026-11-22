import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { PNG } from 'pngjs';
import manifest from '../assets/manifest.json';
import { encodeSprite, spriteArt } from '../tools/sprite-art';
import {
  helmetColors,
  pedestrianDirections,
  riderDirections,
  riderPose,
  spriteDirection,
  spriteSheets,
  vehicleFrame,
} from '../src/render/spriteFrames';

const generated = spriteArt();

function frame(image: PNG, index: number, width: number, height: number) {
  const columns = image.width / width;
  const tile = new PNG({ width, height });
  PNG.bitblt(
    image,
    tile,
    (index % columns) * width,
    Math.floor(index / columns) * height,
    width,
    height,
    0,
    0,
  );
  return tile;
}

test('sprite generator reproduces the checked-in bytes and manifest grids', () => {
  const second = spriteArt();
  const palette = new Set(
    readFileSync('assets/palette.hex', 'utf8').trim().split('\n'),
  );
  for (const [id, [frameWidth, frameHeight, columns, rows]] of Object.entries(
    spriteSheets,
  )) {
    const key = id as keyof typeof generated;
    const image = generated[key];
    const file = `generated/${id}.png`;
    const directions =
      id === 'traffic-pedestrian'
        ? pedestrianDirections
        : id === 'rider' || id === 'rider-lights' || id === 'traffic-cyclist'
          ? riderDirections
          : 1;
    expect(manifest.assets.find((entry) => entry.id === id)).toMatchObject({
      file,
      frameWidth,
      frameHeight,
      width: columns * frameWidth,
      height: rows * frameHeight,
      frames: columns * rows,
      directions,
    });
    const encoded = encodeSprite(image);
    expect(encoded.equals(encodeSprite(second[key])), id).toBe(true);
    expect(encoded.equals(readFileSync(`assets/${file}`)), id).toBe(true);
    for (let i = 0; i < image.data.length; i += 4)
      if (
        image.data[i + 3] &&
        !palette.has('#' + image.data.toString('hex', i, i + 3))
      )
        throw new Error(
          `Sprite ${id} contains a color outside the project palette`,
        );
  }
});

test('rider and pedestrian strides and orientations have distinct raster frames', () => {
  for (const [id, directions, size] of [
    ['rider', riderDirections, 24],
    ['traffic-cyclist', riderDirections, 24],
    ['traffic-pedestrian', pedestrianDirections, 16],
  ] as const) {
    const image = generated[id];
    const passes = new Set<string>();
    for (let index = 0; index < directions * 4; index++)
      passes.add(frame(image, index, size, size).data.toString('hex'));
    expect(passes.size, id).toBe(directions * 4);
  }
  expect(spriteDirection(-Math.PI / 2, riderDirections)).toBe(0);
  expect(spriteDirection(0, riderDirections)).toBe(4);
  expect(spriteDirection((3 * Math.PI) / 2, riderDirections)).toBe(0);
  const [gold, blue, pink] = helmetColors.map((_, index) =>
    frame(generated.rider, index * 30 * riderDirections, 24, 24).data.toString(
      'hex',
    ),
  );
  expect(new Set([gold, blue, pink]).size).toBe(3);
});

test('simulated maneuvers select the expected front and rear lamp colors', () => {
  const pixel = (index: number, x: number, y: number) => {
    const { data } = frame(generated['traffic-car'], index, 32, 48);
    const at = (y * 32 + x) * 4;
    return data.toString('hex', at, at + 3);
  };
  const left = vehicleFrame(0, true, 'left', true);
  const right = vehicleFrame(0, false, 'right', true);
  expect(pixel(left, 7, 9)).toBe('feae34');
  expect(pixel(left, 23, 41)).toBe('e43b44');
  expect(pixel(right, 23, 42)).toBe('feae34');
  expect(pixel(vehicleFrame(0, false, 'right', false), 23, 42)).toBe('b13e53');
});

test('the two baked hand signals extend beyond the neutral silhouette', () => {
  const image = generated.rider;
  const left = frame(
    image,
    riderPose(0, 'left', true, false, -1) * riderDirections,
    24,
    24,
  );
  const right = frame(
    image,
    riderPose(0, 'right', false, false, -1) * riderDirections,
    24,
    24,
  );
  const relaxed = frame(image, 0, 24, 24);
  const alpha = (tile: PNG, x: number) => tile.data[(9 * 24 + x) * 4 + 3];
  expect([alpha(left, 2), alpha(relaxed, 2), alpha(right, 2)]).toEqual([
    255, 0, 0,
  ]);
  expect([alpha(left, 20), alpha(relaxed, 20), alpha(right, 20)]).toEqual([
    0, 0, 255,
  ]);
});
