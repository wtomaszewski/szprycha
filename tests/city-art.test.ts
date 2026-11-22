import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { expect, test } from 'vitest';
import manifest from '../assets/manifest.json';
import { BALL_FRAME, tiles } from '../src/render/artFrames';
import { cityArt } from '../tools/city-art';
import { tileTerrain } from '../tools/tile-terrain';

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
