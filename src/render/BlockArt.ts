import type { Scene, Textures } from 'phaser';
import { artHash, roofDetails, roofKinds, wallKinds } from './artFrames';
import { FLOOR_PX, type Block } from './projection';

const isPalaceTower = (b: Block) =>
  b.landmarkId === 'palace-test' || b.landmarkId === 'pkin';

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

function roofMaterial(b: Block, hash: number) {
  const requested = roofKinds.findIndex((kind) => kind === b.roof);
  if (requested >= 0) return requested;
  if (isPalaceTower(b)) return 3;
  return b.floors <= 2 ? 0 : hash % roofKinds.length;
}

export function visitRoofDetails(
  b: Block,
  hash: number,
  visit: (kind: number, x: number, y: number) => void,
) {
  if (
    isPalaceTower(b) ||
    b.landmarkId === 'planetarium' ||
    b.landmarkId === 'rotunda' ||
    b.landmarkId === 'metro' ||
    b.landmarkId === 'palac-na-wodzie'
  )
    return;
  const material = roofMaterial(b, hash);
  for (let y = 8; y + 36 <= b.height; y += 54)
    for (let x = 8; x + 36 <= b.width; x += 52) {
      const n = artHash(x, y, hash);
      if (n % 2 === 0 && (x !== 8 || y !== 8)) continue;
      const kind = material === 1 ? n % 2 : n % roofDetails.length;
      visit(kind, x + ((n >>> 4) & 3), y + ((n >>> 6) & 3));
    }
}

export function roofTexture(scene: Scene, key: string, b: Block, hash: number) {
  const palace = isPalaceTower(b);
  const material = roofMaterial(b, hash);
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
      if (b.landmarkId === 'kopernik') {
        ctx.fillStyle = '#257179';
        ctx.fillRect(20, 20, b.width - 40, b.height - 40);
        for (let x = 28; x < b.width - 32; x += 16) {
          ctx.fillStyle = x % 32 === 12 ? '#38b764' : '#6ab08a';
          ctx.fillRect(x, 34, 8, b.height - 68);
        }
        return;
      }
      if (b.landmarkId === 'planetarium' || b.landmarkId === 'rotunda') {
        for (let y = 0; y < b.height; y++) {
          const radius = b.height / 2;
          const inset = Math.floor(
            (b.width / 2) *
              (1 - Math.sqrt(1 - ((y + 0.5 - radius) / radius) ** 2)),
          );
          ctx.fillStyle = y < radius ? '#c0cbdc' : '#94b0c2';
          ctx.fillRect(inset, y, b.width - 2 * inset, 1);
        }
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(b.width / 4, b.height / 4, b.width / 3, 3);
        return;
      }
      if (b.landmarkId === 'metro') {
        const x = Math.floor(b.width / 2);
        ctx.fillStyle = '#e43b44';
        ctx.fillRect(x - 12, 4, 24, 20);
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(x - 8, 8, 3, 12);
        ctx.fillRect(x + 5, 8, 3, 12);
        ctx.fillRect(x - 5, 10, 3, 4);
        ctx.fillRect(x - 2, 13, 4, 4);
        ctx.fillRect(x + 2, 10, 3, 4);
        return;
      }
      if (b.landmarkId === 'glass-spire') {
        ctx.fillStyle = '#c0cbdc';
        ctx.fillRect(Math.floor(b.width / 2) - 2, 4, 4, 23);
      }
      if (b.landmarkId === 'palac-na-wodzie') {
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(8, 6, b.width - 16, b.height - 12);
        ctx.fillStyle = '#c0cbdc';
        ctx.fillRect(26, 14, b.width - 52, b.height - 32);
        ctx.fillRect(64, b.height - 22, b.width - 128, 16);
        return;
      }
      const details = sheetImage(scene, 'roof-details');
      visitRoofDetails(b, hash, (kind, x, y) =>
        ctx.drawImage(details, kind * 32, 0, 32, 32, x, y, 32, 32),
      );
    },
  );
}

function wallMaterial(b: Block, hash: number) {
  const requested = wallKinds.findIndex((kind) => kind === b.wall);
  if (requested >= 0) return requested;
  return isPalaceTower(b) ? 0 : hash % wallKinds.length;
}

export function wallEmissionTexture(
  scene: Scene,
  key: string,
  b: Block,
  hash: number,
  width: number,
  floors: number,
  groundFloor: boolean,
) {
  const material = wallMaterial(b, hash);
  return surfaceTexture(
    scene,
    key,
    Math.ceil(width),
    floors * FLOOR_PX,
    (ctx) => {
      for (let floor = 0; floor < floors; floor++) {
        const row = groundFloor && floor === floors - 1 ? 2 : floor % 2;
        for (let x = 0; x < width; x += 32) {
          const variant = artHash(x, floor, hash) & 3;
          const y = floor * FLOOR_PX + 3;
          ctx.fillStyle = 'rgba(255, 205, 117, 0.58)';
          if (row === 2 && variant % 2 === 0) {
            ctx.fillRect(x + 19, y, 10, 6);
            continue;
          }
          for (const pane of [4, 19]) {
            if (
              artHash(pane + material, row + variant, 30) % 5 === 0 ||
              (variant === 3 && pane === 4)
            )
              ctx.fillRect(x + pane + 2, y, 6, 6);
          }
        }
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
  const material = wallMaterial(b, hash);
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
    if (b.wall === 'glass') {
      ctx.fillStyle = '#333c57';
      ctx.fillRect(0, 0, width, height);
      for (let y = 1; y < height; y += FLOOR_PX)
        for (let x = 2; x < width; x += 12) {
          ctx.fillStyle = (x + y) % 36 === 3 ? '#73eff7' : '#0099db';
          ctx.fillRect(x, y, Math.min(10, width - x), 9);
        }
    }
    if (b.landmarkId === 'palac-na-wodzie') {
      ctx.fillStyle = '#c0cbdc';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#f4f4f4';
      for (let x = 6; x < width - 6; x += 16) ctx.fillRect(x, 4, 5, height - 8);
      ctx.fillRect(0, 0, width, 4);
      ctx.fillRect(0, height - 4, width, 4);
    }
    if (isPalaceTower(b) && b.floors === 26 && width >= 20) {
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
