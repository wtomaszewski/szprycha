import type { Scene, Textures } from 'phaser';
import { artHash, roofDetails, roofKinds, wallKinds } from './artFrames';
import { paintAfrykariumGlass, paintAfrykariumRoof } from './LandmarkArt';
import { FLOOR_PX, type Block } from './projection';
import { shadowColor, shadowRise } from './shadows';

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
    b.landmarkId === 'palac-na-wodzie' ||
    b.landmarkId === 'hala-stulecia' ||
    b.landmarkId === 'stadion-wroclaw' ||
    b.landmarkId === 'afrykarium' ||
    b.landmarkId === 'zamek-krolewski' ||
    b.landmarkId === 'ratusz-wroclawski' ||
    b.landmarkId === 'sukiennice' ||
    b.landmarkId === 'lodz-fabryka-komin' ||
    b.landmarkId?.startsWith('lodz-mural-') ||
    b.landmarkId === 'wawel-kopula' ||
    b.landmarkId === 'wawel-baszta' ||
    b.landmarkId?.startsWith('katedra-wieza-')
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
      if (b.landmarkId === 'afrykarium') {
        paintAfrykariumRoof(ctx, b.width, b.height);
        return;
      }
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
      if (b.landmarkId === 'lodz-fabryka-komin') {
        ctx.fillStyle = '#8c4b3e';
        ctx.fillRect(0, 0, b.width, b.height);
        ctx.fillStyle = '#c17a5b';
        ctx.fillRect(1, 1, b.width - 2, 3);
        ctx.fillRect(1, 4, 3, b.height - 5);
        ctx.fillStyle = '#3b272a';
        ctx.fillRect(5, 5, b.width - 10, b.height - 10);
        ctx.fillStyle = '#1a1c2c';
        ctx.fillRect(7, 7, b.width - 14, b.height - 14);
        return;
      }
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
      if (
        b.landmarkId?.startsWith('poznan-budnicza-') ||
        b.landmarkId === 'gdansk-kamienica' ||
        b.landmarkId === 'zuraw-wieza'
      ) {
        ctx.fillStyle = '#5a3a2e';
        ctx.fillRect(b.width / 2 - 2, 2, 4, b.height - 4);
        ctx.fillStyle = b.roof === 'copper' ? '#9cceb0' : '#d98a5a';
        ctx.fillRect(b.width / 2 - 1, 2, 1, b.height - 4);
        for (let x = 4; x < b.width / 2 - 2; x += 6) {
          ctx.fillRect(x, b.height - 5, 4, 3);
          ctx.fillRect(b.width - x - 4, b.height - 5, 4, 3);
        }
        return;
      }
      if (b.landmarkId === 'zuraw-korpus') {
        ctx.fillStyle = '#382b29';
        ctx.fillRect(2, 2, b.width - 4, b.height - 5);
        ctx.fillStyle = '#725143';
        for (let x = 5; x < b.width - 3; x += 6)
          ctx.fillRect(x, 3, 1, b.height - 7);
        ctx.fillRect(2, 6, b.width - 4, 3);
        ctx.fillRect(2, b.height - 10, b.width - 4, 3);
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
        ctx.fillStyle = '#257179';
        ctx.fillRect(x - 12, 4, 24, 20);
        // An entrance pictogram drawn as descending steps.
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(x - 8, 8, 5, 3);
        ctx.fillRect(x - 3, 11, 5, 3);
        ctx.fillRect(x + 2, 14, 5, 3);
        ctx.fillRect(x + 7, 17, 3, 3);
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
      if (b.landmarkId === 'zamek-krolewski' && b.floors > 4) {
        const mid = Math.floor(b.width / 2);
        const middleY = Math.floor(b.height / 2);
        ctx.fillStyle = '#257179';
        ctx.fillRect(0, 0, b.width, b.height);
        for (let inset = 2; inset < Math.min(mid, middleY) - 2; inset += 2) {
          ctx.fillStyle = inset % 4 === 0 ? '#6ab08a' : '#3e8948';
          ctx.fillRect(inset, inset, b.width - 2 * inset, b.height - 2 * inset);
        }
        ctx.fillStyle = '#f0dca8';
        ctx.fillRect(mid - 1, middleY - 1, 3, 3);
        return;
      }
      if (b.landmarkId === 'sukiennice' && b.width > 64) {
        ctx.fillStyle = '#f0dca8';
        for (const y of [3, b.height - 10]) {
          ctx.fillRect(3, y + 4, b.width - 6, 4);
          for (let x = 8; x < b.width - 7; x += 13) {
            ctx.fillRect(x, y, 7, 5);
            ctx.fillRect(x + 2, y - 2, 3, 3);
          }
        }
        ctx.fillStyle = '#a65e46';
        ctx.fillRect(18, Math.floor(b.height / 2), b.width - 36, 4);
        return;
      }
      if (b.landmarkId === 'wawel-kopula' || b.landmarkId === 'wawel-baszta') {
        const gold = b.landmarkId === 'wawel-kopula';
        const cx = Math.floor(b.width / 2);
        const cy = Math.floor(b.height / 2);
        const radius = Math.min(cx, cy) - 1;
        ctx.fillStyle = gold ? '#8c643d' : '#254c44';
        ctx.fillRect(0, 0, b.width, b.height);
        for (let dy = -radius; dy <= radius; dy++) {
          const span = Math.floor(Math.sqrt(radius ** 2 - dy ** 2));
          ctx.fillStyle = gold
            ? dy <= 0
              ? '#ffcd75'
              : '#c5944e'
            : dy <= 0
              ? '#6ab08a'
              : '#3e8948';
          ctx.fillRect(cx - span, cy + dy, span * 2 + 1, 1);
        }
        ctx.fillStyle = gold ? '#f4f4f4' : '#a7c974';
        ctx.fillRect(cx - 2, cy - 2, 5, 5);
        return;
      }
      if (b.landmarkId === 'hala-stulecia') {
        const radius = b.width / 2;
        ctx.clearRect(0, 0, b.width, b.height);
        // Integer scanlines draw the complete silhouette of each concrete ring.
        for (let y = 0; y < b.height; y++) {
          const dy = y + 0.5 - radius;
          const half = Math.floor(Math.sqrt(radius ** 2 - dy ** 2));
          ctx.fillStyle = dy < 0 ? '#c0cbdc' : '#94b0c2';
          ctx.fillRect(radius - half, y, half * 2, 1);
          for (const [inset, color] of [
            [5, '#566c86'],
            [14, '#f4f4f4'],
            [23, '#566c86'],
          ] as const) {
            const ring = radius - inset;
            if (Math.abs(dy) >= ring) continue;
            const outer = Math.floor(Math.sqrt(ring ** 2 - dy ** 2));
            const inner = Math.floor(
              Math.sqrt(Math.max(0, (ring - 3) ** 2 - dy ** 2)),
            );
            ctx.fillStyle = color;
            ctx.fillRect(radius - outer, y, outer - inner, 1);
            ctx.fillRect(radius + inner, y, outer - inner, 1);
          }
        }
        for (let i = 0; i < 36; i++) {
          const angle = (i * Math.PI) / 18;
          ctx.fillStyle = i % 3 === 0 ? '#73eff7' : '#566c86';
          ctx.fillRect(
            Math.round(radius + Math.cos(angle) * (radius - 32)) - 3,
            Math.round(radius + Math.sin(angle) * (radius - 32)) - 2,
            6,
            4,
          );
        }
        if (b.floors === 8) {
          for (let y = -13; y <= 13; y++) {
            const span = Math.floor(Math.sqrt(14 ** 2 - y ** 2));
            ctx.fillStyle = y < 0 ? '#f4f4f4' : '#566c86';
            ctx.fillRect(radius - span, radius + y, span * 2, 1);
          }
          ctx.fillStyle = '#94b0c2';
          ctx.fillRect(radius - 5, radius - 5, 10, 10);
        }
      } else if (b.landmarkId === 'ratusz-wroclawski' && b.floors === 4) {
        for (let x = 14; x < b.width - 10; x += 32) {
          ctx.fillStyle = '#5a3a2e';
          ctx.fillRect(x, b.height - 30, 20, 27);
          ctx.fillStyle = '#d98a5a';
          for (let i = 0; i < 4; i++)
            ctx.fillRect(x + i * 2, b.height - 6 - i * 5, 19 - i * 4, 5);
        }
      } else if (
        b.landmarkId?.startsWith('katedra-wieza-') &&
        b.floors === 16
      ) {
        ctx.clearRect(0, 0, b.width, b.height);
        for (let y = 0; y < b.height; y++) {
          const inset = Math.floor((b.width / 2) * (1 - y / b.height));
          ctx.fillStyle = '#6ab08a';
          ctx.fillRect(inset, y, b.width - inset * 2, 1);
          ctx.fillStyle = '#3e8948';
          ctx.fillRect(b.width / 2, y, b.width / 2 - inset, 1);
        }
      } else if (b.landmarkId === 'stadion-wroclaw') {
        ctx.fillStyle = '#333c57';
        ctx.fillRect(15, 15, b.width - 30, b.height - 30);
        ctx.fillStyle = '#3e8948';
        ctx.fillRect(61, 57, b.width - 122, b.height - 114);
        ctx.strokeStyle = '#f4f4f4';
        ctx.lineWidth = 2;
        ctx.strokeRect(72, 69, b.width - 144, b.height - 138);
        ctx.fillRect(b.width / 2 - 1, 69, 2, b.height - 138);
        ctx.beginPath();
        ctx.arc(b.width / 2, b.height / 2, 26, 0, Math.PI * 2);
        ctx.stroke();
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
      if (
        b.landmarkId === 'afrykarium' ||
        b.landmarkId === 'lodz-fabryka-komin' ||
        b.landmarkId?.startsWith('lodz-mural-')
      )
        return;
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
    const merchantHouseColors: Readonly<Partial<Record<string, string>>> = {
      'poznan-budnicza-gold': '#e7b45f',
      'poznan-budnicza-rose': '#d77e7c',
      'poznan-budnicza-mint': '#8db789',
      'poznan-budnicza-blue': '#83adce',
    };
    const merchantColor = merchantHouseColors[b.landmarkId ?? ''];
    const townHall = b.landmarkId === 'poznan-ratusz' && b.floors === 5;
    if (merchantColor || townHall) {
      ctx.fillStyle = merchantColor ?? '#e9d9bb';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#69514d';
      for (let y = 0; y < height; y += FLOOR_PX) {
        for (let x = 7; x < width - 8; x += 17) {
          const opening = townHall ? 10 : 7;
          ctx.fillRect(x, y + 5, opening, FLOOR_PX - 7);
          ctx.fillRect(x + 2, y + 3, opening - 4, 2);
        }
      }
      ctx.fillStyle = '#f2e2c4';
      for (let y = 0; y < height; y += FLOOR_PX) ctx.fillRect(0, y, width, 2);
    }
    if (b.landmarkId === 'lodz-kamienica') {
      ctx.fillStyle = '#e9d7ba';
      for (let y = 0; y < height; y += FLOOR_PX) ctx.fillRect(0, y, width, 2);
      for (let x = 1; x < width; x += 32) ctx.fillRect(x, 0, 2, height);
      if (groundFloor) {
        ctx.fillStyle = '#613f43';
        ctx.fillRect(width / 2 - 7, height - 13, 14, 13);
        ctx.fillRect(width / 2 - 5, height - 15, 10, 2);
      }
    }
    if (b.landmarkId === 'lodz-fabryka-komin') {
      ctx.fillStyle = '#8c4b3e';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#533230';
      for (let y = 3; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1);
        for (let x = y % 8 === 3 ? 5 : 11; x < width; x += 12)
          ctx.fillRect(x, y - 3, 1, 3);
      }
      ctx.fillStyle = '#af6950';
      ctx.fillRect(0, 0, width, 4);
    }
    if (b.landmarkId === 'lodz-fabryka-hala') {
      for (let y = 0; y < height; y += FLOOR_PX) {
        for (let x = 3; x < width - 10; x += 20) {
          ctx.fillStyle = '#482b28';
          ctx.fillRect(x, y + 6, 10, FLOOR_PX - 6);
          ctx.fillRect(x + 2, y + 4, 6, 2);
          ctx.fillStyle = '#829092';
          ctx.fillRect(x + 2, y + 7, 6, 2);
        }
      }
    }
    const mural = b.landmarkId;
    if (
      (mural === 'lodz-mural-fale' || mural === 'lodz-mural-romb') &&
      width >= 60
    ) {
      const left = Math.floor(width * 0.15);
      const right = Math.ceil(width * 0.85);
      ctx.fillStyle = '#252941';
      ctx.fillRect(left, 6, right - left, height - 12);
      for (let x = left; x < right - 2; x += 3) {
        const phase = (x - left) / (right - left);
        const offset =
          mural === 'lodz-mural-fale'
            ? Math.round((Math.sin(phase * Math.PI * 4) * (height - 32)) / 3)
            : Math.round((0.5 - Math.abs(phase - 0.5)) * (height - 18));
        ctx.fillStyle = mural === 'lodz-mural-fale' ? '#38b8a6' : '#ad80c4';
        ctx.fillRect(x, height / 2 - 5 + offset, 3, 5);
        ctx.fillStyle = '#f3ba70';
        ctx.fillRect(x, height / 2 - 2 - offset, 3, 5);
      }
    }
    if (b.landmarkId === 'zuraw-korpus') {
      ctx.fillStyle = '#3e2c28';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#694633';
      for (let x = 2; x < width; x += 6) ctx.fillRect(x, 0, 1, height);
      for (let y = 4; y < height; y += FLOOR_PX) ctx.fillRect(0, y, width, 3);
      if (groundFloor) {
        ctx.fillStyle = '#1a1c2c';
        ctx.fillRect(width / 2 - 9, height - 14, 18, 14);
      }
    }
    if (b.landmarkId === 'afrykarium') {
      paintAfrykariumGlass(ctx, 0, 0, width, height);
    } else if (b.wall === 'glass') {
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
    if (
      width >= 20 &&
      ((isPalaceTower(b) && b.floors === 26) ||
        (b.landmarkId === 'zamek-krolewski' && b.floors > 4))
    ) {
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
    if (b.landmarkId === 'ratusz-wroclawski' && b.floors === 10) {
      const x = Math.round(width / 2);
      ctx.fillStyle = '#ffcd75';
      ctx.beginPath();
      ctx.arc(x, 13, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#29366f';
      ctx.beginPath();
      ctx.arc(x, 13, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0dca8';
      ctx.fillRect(x - 1, 8, 2, 6);
      ctx.fillRect(x, 13, 5, 2);
    }
    if (b.landmarkId === 'dworzec-glowny') {
      ctx.fillStyle = '#f0dca8';
      for (let x = 4; x < width; x += 16) ctx.fillRect(x, 0, 9, 6);
    }
    if (b.landmarkId === 'stadion-wroclaw') {
      for (let x = 1; x < width; x += 9) {
        ctx.fillStyle = x % 3 === 1 ? '#c0cbdc' : '#94b0c2';
        ctx.fillRect(x, 4, 4, height - 8);
      }
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
  for (const [band, alpha] of [
    [2, 0.09],
    [1, 0.12],
    [0, 0.16],
  ] as const) {
    // Fill each band as a union so tiers and adjacent blocks do not stack ink.
    ctx.beginPath();
    for (const b of blocks) {
      const shift = Math.min(104, 7 + b.floors * 4);
      const rise = shadowRise(shift);
      if (
        b.x - band > left + width ||
        b.y - band > top + height ||
        b.x + b.width + shift + band < left ||
        b.y + b.height + rise + band < top
      )
        continue;
      const start = Math.max(Math.floor(b.y) - band, top);
      const end = Math.min(
        Math.ceil(b.y + b.height + rise) + band,
        top + height,
      );
      for (let y = start; y < end; y++) {
        const enter = Math.max(0, (y - b.y - b.height) / rise);
        const leave = Math.max(0, Math.min(1, (y - b.y + 1) / rise));
        const from = Math.round(b.x + enter * shift) - band;
        const to = Math.round(b.x + b.width + leave * shift) + band;
        ctx.rect(from, y, to - from, 1);
      }
    }
    ctx.fillStyle = shadowColor(alpha);
    ctx.fill();
  }
}
