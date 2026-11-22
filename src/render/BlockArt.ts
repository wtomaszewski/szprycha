import type { Scene, Textures } from 'phaser';
import { artHash, roofDetails, roofKinds, wallKinds } from './artFrames';
import { FLOOR_PX, type Block } from './projection';

const cornice = [
  ['#c0cbdc', '#1a1c2c'],
  ['#d98a5a', '#5a3a2e'],
  ['#c0cbdc', '#257179'],
  ['#f0dca8', '#8b6d5c'],
] as const;

function surfaceTexture(
  scene: Scene,
  key: string,
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): Textures.Texture {
  if (scene.textures.exists(key)) return scene.textures.get(key);
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`Cannot create art texture ${key}`);
  paint(texture.context);
  texture.refresh();
  return texture;
}

export function sheetImage(scene: Scene, key: string) {
  const source = scene.textures.get(key).getSourceImage();
  if (!(source instanceof HTMLImageElement))
    throw new Error(`Missing art atlas ${key}`);
  return source;
}

export function roofTexture(scene: Scene, key: string, b: Block, hash: number) {
  const palace = b.landmarkId === 'palace-test';
  const requested = roofKinds.findIndex((kind) => kind === b.roof);
  const material =
    requested >= 0
      ? requested
      : palace
        ? 3
        : b.floors <= 2
          ? 0
          : hash % roofKinds.length;
  return surfaceTexture(
    scene,
    key,
    Math.ceil(b.width),
    Math.ceil(b.height),
    (ctx) => {
      const sheet = sheetImage(scene, 'block-roofs');
      for (let y = 0; y < b.height; y += 32)
        for (let x = 0; x < b.width; x += 32) {
          const w = Math.min(32, b.width - x);
          const h = Math.min(32, b.height - y);
          const variant = artHash(x, y, hash) & 3;
          ctx.drawImage(sheet, variant * 32, material * 32, w, h, x, y, w, h);
        }
      const [light, dark] = cornice[material]!;
      ctx.fillStyle = dark;
      ctx.fillRect(0, b.height - 3, b.width, 3);
      ctx.fillRect(b.width - 3, 0, 3, b.height);
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, b.width, 2);
      ctx.fillRect(0, 0, 2, b.height);
      if (palace) {
        for (let x = 4; x < b.width - 3; x += 8) {
          ctx.fillRect(x, 2, 4, 2);
          ctx.fillRect(x, b.height - 5, 4, 2);
        }
        for (let y = 4; y < b.height - 3; y += 8) {
          ctx.fillRect(2, y, 2, 4);
          ctx.fillRect(b.width - 5, y, 2, 4);
        }
        if (b.width <= 8) ctx.fillRect(2, 2, b.width - 4, b.height - 4);
        return;
      }
      const details = sheetImage(scene, 'roof-details');
      for (let y = 8; y + 36 <= b.height; y += 54)
        for (let x = 8; x + 36 <= b.width; x += 52) {
          const n = artHash(x, y, hash);
          if (n % 2 === 0 && (x !== 8 || y !== 8)) continue;
          const kind = material === 1 ? n % 2 : n % roofDetails.length;
          ctx.drawImage(
            details,
            kind * 32,
            0,
            32,
            32,
            x + ((n >>> 4) & 3),
            y + ((n >>> 6) & 3),
            32,
            32,
          );
        }
    },
  );
}

export function wallTexture(
  scene: Scene,
  key: string,
  b: Block,
  hash: number,
  width: number,
  floors: number,
  groundFloor: boolean,
  sunny: boolean,
) {
  const requested = wallKinds.findIndex((kind) => kind === b.wall);
  const material =
    requested >= 0
      ? requested
      : b.landmarkId === 'palace-test'
        ? 0
        : hash % wallKinds.length;
  const height = floors * FLOOR_PX;
  return surfaceTexture(scene, key, Math.ceil(width), height, (ctx) => {
    const sheet = sheetImage(scene, 'block-walls');
    for (let floor = 0; floor < floors; floor++) {
      const row = groundFloor && floor === floors - 1 ? 2 : floor % 2;
      for (let x = 0; x < width; x += 32) {
        const variant = artHash(x, floor, hash) & 3;
        const w = Math.min(width - x, 32);
        ctx.drawImage(
          sheet,
          variant * 32,
          (material * 3 + row) * FLOOR_PX,
          w,
          FLOOR_PX,
          x,
          floor * FLOOR_PX,
          w,
          FLOOR_PX,
        );
      }
    }
    if (b.landmarkId === 'palace-test' && b.floors === 26 && width >= 20) {
      const x = Math.floor(width / 2);
      ctx.fillStyle = '#5a3a2e';
      ctx.fillRect(x - 6, 4, 12, 12);
      ctx.fillStyle = '#f0dca8';
      ctx.fillRect(x - 4, 5, 8, 10);
      ctx.fillRect(x - 5, 6, 10, 8);
      ctx.fillStyle = '#1a1c2c';
      ctx.fillRect(x, 7, 1, 5);
      ctx.fillRect(x, 10, 3, 1);
    }
    if (!sunny) {
      ctx.fillStyle = 'rgba(26, 28, 44, 0.28)';
      ctx.fillRect(0, 0, width, height);
    }
  });
}

/** Paint a fixed, stepped penumbra along each building's south-east shadow. */
export function paintBlockShadows(
  ctx: CanvasRenderingContext2D,
  blocks: readonly Block[],
  left: number,
  top: number,
  width: number,
  height: number,
) {
  for (const b of blocks) {
    const shift = Math.min(104, 7 + b.floors * 4);
    const rise = Math.round(shift * 0.73);
    if (
      b.x > left + width ||
      b.y > top + height ||
      b.x + b.width + shift + 3 < left ||
      b.y + b.height + rise + 3 < top
    )
      continue;
    for (let band = 2; band >= 0; band--) {
      ctx.fillStyle =
        band === 2 ? 'rgba(26, 28, 44, 0.09)' : 'rgba(26, 28, 44, 0.14)';
      const start = Math.max(Math.floor(b.y) - band, top);
      const end = Math.min(
        Math.ceil(b.y + b.height + rise) + band,
        top + height,
      );
      for (let y = start; y < end; y++) {
        const enter = Math.max(0, (y - b.y - b.height) / rise);
        const leave = Math.min(1, (y - b.y + 1) / rise);
        const from = Math.round(b.x + enter * shift) - band;
        const to = Math.round(b.x + b.width + leave * shift) + band;
        ctx.fillRect(from, y, to - from, 1);
      }
    }
  }
}
