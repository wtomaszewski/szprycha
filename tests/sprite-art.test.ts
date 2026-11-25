import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { PNG } from 'pngjs';
import { parse } from 'yaml';
import manifest from '../assets/manifest.json';
import { dialogueFileSchema, portraitEmotions } from '../src/content/dialogues';
import { portraitArt } from '../tools/portrait-art';
import { encodeSprite, spriteArt } from '../tools/sprite-art';
import { encodeSpriteSheet } from '../tools/sprite-png';
import {
  helmetColors,
  idleRiderPose,
  pedalFrames,
  pedestrianDirections,
  pedestrianSeasonRows,
  riderDirections,
  riderFrame,
  riderPose,
  spriteDirection,
  spriteSheets,
  vehicleFrame,
  walkFrames,
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
    readFileSync('assets/palette.hex', 'utf8')
      .trim()
      .split('\n')
      .map((value) => Number.parseInt(value.slice(1), 16)),
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
    const encoded = encodeSpriteSheet(image);
    expect(image.data.equals(second[key].data), id).toBe(true);
    expect(PNG.sync.read(encoded).data.equals(image.data), id).toBe(true);
    expect(encoded.equals(readFileSync(`assets/${file}`)), id).toBe(true);
    for (let i = 0; i < image.data.length; i += 4)
      if (
        image.data[i + 3] &&
        !palette.has(
          (image.data[i]! << 16) |
            (image.data[i + 1]! << 8) |
            image.data[i + 2]!,
        )
      )
        throw new Error(
          `Sprite ${id} contains a color outside the project palette`,
        );
  }
}, 15_000);

test('pedal and walk cycles have distinct frames in every prescribed heading', () => {
  for (const [id, directions, strides, start, rows] of [
    ['rider', riderDirections, pedalFrames, idleRiderPose, 1],
    [
      'traffic-cyclist',
      riderDirections,
      pedalFrames,
      0,
      spriteSheets['traffic-cyclist'][3] / pedalFrames,
    ],
    [
      'traffic-pedestrian',
      pedestrianDirections,
      walkFrames,
      0,
      (2 * pedestrianSeasonRows) / walkFrames,
    ],
  ] as const) {
    const [width, height] = spriteSheets[id];
    const image = generated[id];
    for (let row = 0; row < rows; row++) {
      const looks = new Set<string>();
      for (let direction = 0; direction < directions; direction++) {
        const frames = Array.from({ length: strides }, (_, stride) => {
          const index =
            (start + row * strides + stride) * directions + direction;
          return frame(image, index, width, height).data.toString('hex');
        });
        looks.add(frames[0]!);
        expect(
          new Set(frames).size,
          `${id}, row ${row}, heading ${direction}`,
        ).toBe(strides);
      }
      expect(looks.size, id).toBe(directions);
    }
  }
  expect(spriteDirection(-Math.PI / 2, riderDirections)).toBe(0);
  expect(spriteDirection(0, riderDirections)).toBe(4);
  expect(spriteDirection((3 * Math.PI) / 2, riderDirections)).toBe(0);
  const helmets = helmetColors.map((_, index) =>
    frame(
      generated.rider,
      riderFrame(index, idleRiderPose, 0),
      32,
      32,
    ).data.toString('hex'),
  );
  expect(new Set(helmets).size).toBe(helmetColors.length);
  const warm = frame(generated['traffic-pedestrian'], 0, 24, 24);
  const winter = frame(
    generated['traffic-pedestrian'],
    pedestrianSeasonRows * pedestrianDirections,
    24,
    24,
  );
  expect(warm.data.equals(winter.data)).toBe(false);
});

test('every dialogue character has a deterministic 64×64 sheet with five distinct emotions', () => {
  const { postacie } = dialogueFileSchema.parse(
    parse(readFileSync('content/dialogi/postacie.yaml', 'utf8')),
  );
  const portraits = portraitArt();
  const repeat = new Map(portraitArt());
  expect(portraits.map(([id]) => id).sort()).toEqual(
    postacie.map(({ id }) => id).sort(),
  );
  for (const [id, image] of portraits) {
    const file = `generated/portraits/${id}.png`;
    expect(
      manifest.assets.find((entry) => entry.id === `portrait-${id}`),
    ).toMatchObject({
      file,
      frameWidth: 64,
      frameHeight: 64,
      width: 64 * portraitEmotions.length,
      height: 64,
      frames: portraitEmotions.length,
      directions: 1,
    });
    expect(encodeSprite(image).equals(encodeSprite(repeat.get(id)!)), id).toBe(
      true,
    );
    expect(encodeSprite(image).equals(readFileSync(`assets/${file}`)), id).toBe(
      true,
    );
    const faces = portraitEmotions.map((_, index) =>
      frame(image, index, 64, 64).data.toString('hex'),
    );
    expect(new Set(faces).size, id).toBe(portraitEmotions.length);
  }
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

test('the atlases contain both full signals, intermediate reaches and three glance angles', () => {
  const tile = (signal: number, glance = 0) =>
    frame(
      generated.rider,
      riderFrame(0, riderPose(0, signal, glance, false, -1), 0),
      32,
      32,
    );
  const alpha = (image: PNG, x: number, y: number) =>
    image.data[(y * 32 + x) * 4 + 3];
  const neutral = tile(0);
  for (const [signal, x] of [
    [-1, 4],
    [1, 28],
  ] as const) {
    const full = tile(signal);
    const half = tile(signal / 2);
    expect(alpha(full, x, 13)).toBe(255);
    expect(alpha(half, x, 13)).toBe(0);
    expect(alpha(neutral, x, 13)).toBe(0);
    expect(half.data.equals(neutral.data)).toBe(false);
  }
  expect(
    new Set([0, 0.5, 1].map((g) => tile(0, g).data.toString('hex'))).size,
  ).toBe(3);
});
