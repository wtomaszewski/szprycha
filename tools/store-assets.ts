import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';
import { appBackground } from './app-icons';

const [red, green, blue] = Buffer.from(appBackground.slice(1), 'hex');

export const storeDevices = [
  { folder: 'google-play/telefon', width: 960, height: 540, scale: 2 },
  { folder: 'google-play/tablet-7', width: 1280, height: 720, scale: 1.5 },
  { folder: 'google-play/tablet-10', width: 1280, height: 720, scale: 2 },
  { folder: 'app-store/iphone-6-9', width: 956, height: 440, scale: 3 },
  { folder: 'app-store/ipad-13', width: 1376, height: 1032, scale: 2 },
] as const;

export const storeScenes = [
  '01-kask-i-swiatla',
  '02-prowadzenie-na-przejsciu',
  '03-plac-manewrowy',
  '04-album-znakow',
  '05-mapa-umiejetnosci',
  '06-zakopane-bezpieczny-zjazd',
  '07-wies-postoj-przed-torami',
  '08-lodz-odstep-od-rikszy',
] as const;

type StoreAsset = { path: string; width: number; height: number };

export function storeScreenshot(
  device: (typeof storeDevices)[number],
  scene: (typeof storeScenes)[number],
): StoreAsset {
  return {
    path: `${device.folder}/${scene}.png`,
    width: device.width * device.scale,
    height: device.height * device.scale,
  };
}

export const storeFeatureGraphic = {
  path: 'google-play/grafika-promocyjna.png',
  width: 1024,
  height: 500,
};

export const storeIcon = {
  path: 'google-play/ikona.png',
  width: 512,
  height: 512,
  alpha: true,
};

export async function writeStorePng(
  output: string,
  asset: StoreAsset & { alpha?: boolean },
  buffer: Buffer,
) {
  const image = PNG.sync.read(buffer);
  const { width, height } = image;
  if (width !== asset.width || height !== asset.height)
    throw new Error(`${asset.path}: unexpected dimensions ${width}×${height}`);
  const path = join(output, asset.path);
  await mkdir(dirname(path), { recursive: true });
  const colorType = asset.alpha ? 6 : 2;
  // Chromium can leave a translucent backdrop above the game canvas.
  const png =
    image.colorType === colorType
      ? buffer
      : PNG.sync.write(image, {
          colorType,
          bgColor: { red: red!, green: green!, blue: blue! },
        });
  await writeFile(path, png);
}
