import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { expect, test } from 'vitest';
import manifest from '../assets/manifest.json';
import { BALL_FRAME, tiles, winterTile } from '../src/render/artFrames';
import { supportingTier } from '../src/render/projection';
import { cityArt } from '../tools/city-art';
import { effectArt } from '../tools/effect-art';
import { tileTerrain } from '../tools/tile-terrain';
import { iconSize, uiArt } from '../tools/ui-art';

const digest = (png: PNG) =>
  createHash('sha256').update(PNG.sync.write(png)).digest('hex');

test('city atlases reproduce the checked-in PNGs for seed 30', () => {
  const generated = cityArt(30);
  const repeated = cityArt(30);
  const different = cityArt(31);
  const palette = new Set(
    readFileSync('assets/palette.hex', 'utf8').trim().split('\n'),
  );
  for (const [file, png] of Object.entries(generated)) {
    const name = file as keyof typeof generated;
    const checkedIn = readFileSync(join('assets/generated', file));
    expect(digest(png), file).toBe(digest(repeated[name]));
    if (name !== 'roof-details.png')
      expect(digest(png), file).not.toBe(digest(different[name]));
    expect(digest(png), file).toBe(
      createHash('sha256').update(checkedIn).digest('hex'),
    );
    for (let i = 0; i < png.data.length; i += 4)
      if (png.data[i + 3]) {
        const color = '#' + png.data.toString('hex', i, i + 3);
        if (!palette.has(color))
          throw new Error(`${file}: color ${color} is outside the palette`);
      }
  }
});

test('the generated effects atlas is reproducible and uses the project palette', () => {
  const atlas = effectArt();
  expect(PNG.sync.write(atlas)).toEqual(
    readFileSync('assets/generated/city-effects.png'),
  );
  const palette = new Set(
    readFileSync('assets/palette.hex', 'utf8').trim().split('\n'),
  );
  const colors = new Set<string>();
  for (let i = 0; i < atlas.data.length; i += 4)
    if (atlas.data[i + 3])
      colors.add('#' + atlas.data.subarray(i, i + 3).toString('hex'));
  expect([...colors].filter((color) => !palette.has(color))).toEqual([]);
});

test('manifest covers every generated image and the declared frame grid fits', () => {
  const files = readdirSync('assets/generated', {
    encoding: 'utf8',
    recursive: true,
  })
    .filter((file) => file.endsWith('.png'))
    .sort();
  expect(
    manifest.assets.map((asset) => asset.file.replace('generated/', '')).sort(),
  ).toEqual(files);
  expect(new Set(manifest.assets.map((asset) => asset.id)).size).toBe(
    files.length,
  );
  for (const {
    file,
    width,
    height,
    frameWidth,
    frameHeight,
    frames,
  } of manifest.assets) {
    const png = PNG.sync.read(readFileSync(join('assets', file)));
    expect([png.width, png.height], file).toEqual([width, height]);
    expect(width % frameWidth, file).toBe(0);
    expect(height % frameHeight, file).toBe(0);
    expect((width / frameWidth) * (height / frameHeight), file).toBe(frames);
  }
});

test('ball sprite has transparency outside the ball footprint', () => {
  const { data, width } = cityArt(30)['props.png'];
  for (let y = 0; y < 48; y++)
    for (let x = 0; x < 48; x++) {
      const alpha = data[(y * width + BALL_FRAME * 48 + x) * 4 + 3];
      if (Math.hypot(x - 24, y - 24) >= 7) expect(alpha).toBe(0);
      else expect(alpha).toBe(255);
    }
});

test('the curb and verge masks meet at a rounded intersection corner', () => {
  const { curb, verge } = tileTerrain(3, 3, [
    'grass',
    'sidewalk',
    'asphalt',
    'sidewalk',
    'sidewalk',
    'asphalt',
    'asphalt',
    'asphalt',
    'asphalt',
  ]);
  expect(curb[2]).toBe(0);
  expect(curb[4]).toBe(tiles.curbMask + 2 + 4);
  expect(curb[8]).toBe(0);
  const { data, width } = cityArt(30)['tiles.png'];
  const gid = curb[4]! - 1;
  const u = (gid % 16) * 32;
  const v = Math.floor(gid / 16) * 32;
  const rgb = (x: number, y: number) => {
    const pixel = ((v + y) * width + u + x) * 4;
    return data.toString('hex', pixel, pixel + 3);
  };
  expect(rgb(31, 31)).toBe('333c57');
  expect(rgb(30, 12)).toBe('c0cbdc');
  expect(rgb(12, 30)).toBe('c0cbdc');
  expect(verge[1]).toBe(tiles.vergeMask + 8);
  expect(verge[3]).toBe(tiles.vergeMask + 1);
});

test('the HUD icons have distinct hard-edged masks and reproduce the checked-in atlas', () => {
  const sheet = uiArt();
  expect(PNG.sync.write(sheet)).toEqual(
    readFileSync('assets/generated/ui-icons.png'),
  );
  const masks = new Set<string>();
  for (let start = 0; start < sheet.width; start += iconSize) {
    const mask: number[] = [];
    for (let y = 0; y < iconSize; y++)
      for (let x = 0; x < iconSize; x++)
        mask.push(sheet.data[(y * sheet.width + start + x) * 4 + 3]!);
    expect(new Set(mask)).toEqual(new Set([0, 255]));
    expect(masks.has(mask.join(','))).toBe(false);
    masks.add(mask.join(','));
  }
});

test('winter swaps surface tiles without replacing markings or cycling asphalt', () => {
  expect(tiles.grassVariants.map(winterTile)).toEqual(tiles.snowGrass);
  expect(tiles.sidewalkVariants.map(winterTile)).toEqual(tiles.snowSidewalk);
  expect(winterTile(tiles.sidewalkLeaves)).toBe(tiles.snowSidewalk[3]);
  const features = [
    tiles.zebra,
    tiles.bikeCrossing,
    tiles.bicycle,
    tiles.asphaltDrain,
  ];
  expect(features.map(winterTile)).toEqual(features);
});

test('road and sidewalk decoration is repeatable and respects surface boundaries', () => {
  const size = 32;
  const surfaces = Array.from({ length: size ** 2 }, (_, i) =>
    i % size < 10 ? 'asphalt' : i % size < 20 ? 'sidewalk' : 'grass',
  );
  const first = tileTerrain(size, size, surfaces);
  expect(tileTerrain(size, size, surfaces)).toEqual(first);
  expect(first.ground).toContain(tiles.asphaltDrain);
  expect(first.ground).toContain(tiles.sidewalkLeaves);
  first.ground.forEach((gid, i) => {
    if (gid === tiles.asphaltDrain) expect(i % size).toBe(9);
    if (gid === tiles.sidewalkLeaves) expect(i % size).toBe(19);
  });
});

test('a projected tier rests on the highest enclosing lower tier', () => {
  const base = { x: 0, y: 0, width: 128, height: 128, floors: 4 };
  const middle = { x: 20, y: 24, width: 60, height: 60, floors: 10 };
  const detached = { ...base, x: 160, floors: 12 };
  const upper = { x: 25, y: 30, width: 36, height: 36, floors: 20 };
  expect(supportingTier(upper, [base, middle, detached])).toBe(middle);
  expect(supportingTier(detached, [base, middle])).toBeUndefined();
  expect(supportingTier({ ...base, floors: 4 }, [base])).toBeUndefined();
});
