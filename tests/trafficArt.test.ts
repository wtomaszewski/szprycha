import { readFileSync } from 'node:fs';
import type { Scene } from 'phaser';
import { PNG } from 'pngjs';
import { expect, it } from 'vitest';
import manifest from '../assets/manifest.json';
import { RiderArt } from '../src/render/RiderArt';
import { TrafficArt, loadTrafficArt } from '../src/render/TrafficArt';
import { smallVehicleTypes } from '../src/render/spriteFrames';

function asset(id: string) {
  return manifest.assets.find((entry) => entry.id === id)!;
}

it('loads traffic sprite frames at manifest dimensions and creates them at native scale', () => {
  const sheets = new Map<string, { frameWidth: number; frameHeight: number }>();
  const placed: { key: string; width: number; height: number }[] = [];
  const image = {
    setDepth: () => image,
    setOrigin: () => image,
    setVisible: () => image,
    fillStyle: () => image,
    fillEllipse: () => image,
  };
  const scene = {
    textures: { exists: () => false },
    load: {
      spritesheet: (
        key: string,
        _url: string,
        config: { frameWidth: number; frameHeight: number },
      ) => sheets.set(key, config),
    },
    add: {
      graphics: () => image,
      image: (_x: number, _y: number, key: string) => {
        const { frameWidth, frameHeight } = sheets.get(key)!;
        placed.push({ key, width: frameWidth, height: frameHeight });
        return image;
      },
    },
  } as unknown as Scene;

  loadTrafficArt(scene);
  const kinds = ['cyclist', 'car', 'emergency', 'tram'] as const;
  for (const kind of kinds) new TrafficArt(scene, kind, 0, 'warszawa');
  new TrafficArt(scene, 'car', smallVehicleTypes.length, 'warszawa');
  new RiderArt(scene, 'gold');
  expect(placed.map(({ key }) => key)).toEqual([
    'traffic-cyclist',
    'traffic-car',
    'traffic-emergency',
    'traffic-tram',
    'traffic-tram',
    'traffic-large',
    'rider',
    'rider-lights',
  ]);
  for (const { key, width, height } of placed) {
    expect([width, height]).toEqual([
      asset(key).frameWidth,
      asset(key).frameHeight,
    ]);
  }

  const [bike, car, , tramFront, tramRear, large, rider] = placed;
  expect(rider!.height).toBe(bike!.height);
  expect(car!.height / bike!.height).toBeGreaterThanOrEqual(2);
  expect(large!.height / bike!.height).toBeLessThanOrEqual(3);
  expect(
    (tramFront!.height + tramRear!.height) / car!.height,
  ).toBeGreaterThanOrEqual(3);
});

function silhouetteLengths(id: string) {
  const { file, frameWidth, frameHeight, frames } = asset(id);
  const { width, data } = PNG.sync.read(readFileSync('assets/' + file));
  const columns = width / frameWidth;
  return Array.from({ length: frames }, (_, frame) => {
    const startX = (frame % columns) * frameWidth;
    const startY = Math.floor(frame / columns) * frameHeight;
    let first = frameHeight;
    let last = -1;
    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        if (data[((startY + y) * width + startX + x) * 4 + 3]! < 128) continue;
        first = Math.min(first, y);
        last = y;
      }
    }
    return last - first + 1;
  });
}

it('draws passenger cars at least twice as long as a cyclist even within the atlas padding', () => {
  const cyclist = silhouetteLengths('traffic-cyclist')[0]!;
  const cars = silhouetteLengths('traffic-car');
  const large = silhouetteLengths('traffic-large');
  const tram = silhouetteLengths('traffic-tram');
  expect(Math.min(...cars) / cyclist).toBeGreaterThanOrEqual(2);
  expect(Math.max(...cars, ...large) / cyclist).toBeLessThanOrEqual(3);
  expect((tram[0]! + tram[1]!) / Math.max(...cars)).toBeGreaterThanOrEqual(3);
});
