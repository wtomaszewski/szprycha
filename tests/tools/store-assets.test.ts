import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { PNG } from 'pngjs';
import { expect, it } from 'vitest';
import { drawAppArt } from '../../tools/app-icons';
import {
  storeDevices,
  storeFeatureGraphic,
  storeIcon,
  storeScenes,
  storeScreenshot,
  writeStorePng,
} from '../../tools/store-assets';

it('uses stable screenshot names and landscape sizes for all five device slots', () => {
  const names = [
    '01-kask-i-swiatla.png',
    '02-prowadzenie-na-przejsciu.png',
    '03-plac-manewrowy.png',
    '04-album-znakow.png',
    '05-mapa-umiejetnosci.png',
  ];
  const sizes = [
    ['google-play/telefon', 1920, 1080],
    ['google-play/tablet-7', 1920, 1080],
    ['google-play/tablet-10', 2560, 1440],
    ['app-store/iphone-6-9', 2868, 1320],
    ['app-store/ipad-13', 2752, 2064],
  ];
  expect(
    storeDevices.flatMap((device) =>
      storeScenes.map((scene) => storeScreenshot(device, scene)),
    ),
  ).toEqual(
    sizes.flatMap(([folder, width, height]) =>
      names.map((name) => ({ path: `${folder}/${name}`, width, height })),
    ),
  );
});

it('ships every store PNG with the dimensions and color type used by the generator', async () => {
  const root = 'store';
  const assets = [
    ...storeDevices.flatMap((device) =>
      storeScenes.map((scene) => ({
        ...storeScreenshot(device, scene),
        alpha: false,
      })),
    ),
    { ...storeFeatureGraphic, alpha: false },
    storeIcon,
  ];
  const files = await readdir(root, { recursive: true, withFileTypes: true });
  expect(
    files
      .filter((file) => file.isFile())
      .map((file) =>
        relative(root, join(file.parentPath, file.name)).split(sep).join('/'),
      )
      .sort(),
  ).toEqual(assets.map(({ path }) => path).sort());

  for (const { path, width, height, alpha } of assets) {
    const png = await readFile(join(root, path));
    expect(png.toString('ascii', 12, 16), path).toBe('IHDR');
    expect([png.readUInt32BE(16), png.readUInt32BE(20), png[25]], path).toEqual(
      [width, height, alpha ? 6 : 2],
    );
  }
});

it('checks PNG dimensions and writes the feature graphic in RGB and the M9 icon in RGBA', async () => {
  const root = await mkdtemp(join(tmpdir(), 'szprycha-store-test-'));
  try {
    const icon = drawAppArt(512, 512, 20);
    await expect(
      writeStorePng(root, storeFeatureGraphic, icon),
    ).rejects.toThrow('unexpected dimensions 512×512');
    await writeStorePng(root, storeIcon, icon);
    const feature = new PNG({ width: 1024, height: 500 });
    await writeStorePng(root, storeFeatureGraphic, PNG.sync.write(feature));
    const savedIcon = await readFile(join(root, 'google-play/ikona.png'));
    const savedFeature = await readFile(
      join(root, 'google-play/grafika-promocyjna.png'),
    );
    expect(PNG.sync.read(savedIcon)).toMatchObject({
      width: 512,
      height: 512,
      colorType: 6,
    });
    const featurePng = PNG.sync.read(savedFeature);
    expect(featurePng).toMatchObject({
      width: 1024,
      height: 500,
      colorType: 2,
    });
    expect([...featurePng.data.subarray(0, 4)]).toEqual([26, 28, 44, 255]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
