import type { Scene, Tilemaps } from 'phaser';
import { cacheMapGraphics } from './MapGround';
import type { Neon } from './NightLighting';

export function drawMapDecorations(
  scene: Scene,
  map: Tilemaps.Tilemap,
  mapId: string,
) {
  const neons: Neon[] = [];
  const scenery = scene.add.graphics().setDepth(4);
  const centers: { x: number; y: number }[] = [];
  for (const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    properties,
  } of map.getObjectLayer('map_decorations')?.objects ?? []) {
    const kind = properties?.find(
      (p: { name: string; value: unknown }) => p.name === 'kind',
    )?.value;
    const tint = properties?.find(
      (p: { name: string }) => p.name === 'color',
    )?.value;
    const color = typeof tint === 'number' ? tint : undefined;
    if (kind === 'neon') {
      const cycling = properties?.some(
        (p: { name: string; value: unknown }) =>
          p.name === 'cycling' && p.value === true,
      );
      neons.push({ x, y, color, cycling });
      continue;
    }
    if (kind === 'bridge') {
      const bridge = scene.add.graphics().setDepth(4);
      const top = { x: x - 40, y: y - 168 };
      bridge.lineStyle(2, 0xc0cbdc, 0.85);
      for (const offset of [-240, -156, -78, 78, 156, 240])
        bridge.lineBetween(top.x, top.y + Math.abs(offset) / 9, x + offset, y);
      bridge.lineStyle(10, 0xf4f4f4).lineBetween(x, y, top.x, top.y);
      bridge.lineStyle(3, 0x94b0c2).lineBetween(x + 4, y, top.x + 4, top.y);
      bridge.lineStyle(4, 0xc0cbdc).lineBetween(x - 296, y, x + 278, y);
      continue;
    }
    centers.push({ x, y });
    if (kind === 'truss-bridge') {
      const steel = color ?? 0x3e8948;
      for (const edge of [x, x + width]) {
        scenery
          .fillStyle(0x29366f)
          .fillRect(edge - 4, y, 8, height)
          .fillStyle(steel)
          .fillRect(edge - 3, y, 6, height);
        for (let dy = 8; dy < height - 14; dy += 20) {
          const outer = edge === x ? edge - 8 : edge + 8;
          scenery
            .lineStyle(2, steel)
            .lineBetween(edge, y + dy, outer, y + dy + 10)
            .lineBetween(outer, y + dy + 10, edge, y + dy + 20)
            .fillStyle(dy % 40 === 8 ? 0xffcd75 : 0xd98a5a)
            .fillRect(edge - 1, y + dy + 10, 3, 4);
          centers.push({ x: edge, y: y + dy });
        }
      }
    } else if (kind === 'penguin') {
      scenery
        .fillStyle(0x1a1c2c)
        .fillEllipse(x, y, 15, 22)
        .fillStyle(0xf4f4f4)
        .fillEllipse(x, y + 3, 9, 12)
        .fillStyle(0xfeae34)
        .fillRect(x - 2, y - 5, 4, 3);
    } else if (kind === 'fountain') {
      const water = color ?? 0x73eff7;
      neons.push({ x, y, color: water });
      scenery
        .fillStyle(0x94b0c2)
        .fillCircle(x, y, 27)
        .fillStyle(0x29366f)
        .fillCircle(x, y, 22)
        .fillStyle(0x41a6f6)
        .fillCircle(x, y, 18)
        .lineStyle(2, water)
        .lineBetween(x, y + 4, x, y - 17)
        .lineBetween(x, y + 4, x - 12, y - 6)
        .lineBetween(x, y + 4, x + 12, y - 6)
        .fillStyle(0xf4f4f4)
        .fillRect(x - 2, y - 16, 4, 3);
    } else if (kind === 'tram-platform') {
      scenery
        .fillStyle(0x333c57)
        .fillRect(x - 2, y - 1, 260, 21)
        .fillStyle(0x94b0c2)
        .fillRect(x, y, 256, 17)
        .fillStyle(0xf0dca8)
        .fillRect(x, y + 2, 256, 2);
      for (let dx = 8; dx < 256; dx += 16)
        scenery.fillStyle(0xc0cbdc).fillRect(x + dx, y + 6, 1, 10);
      centers.push({ x: x + 256, y });
    } else if (kind === 'river-steps') {
      for (let dx = 0; dx < 28; dx += 4)
        scenery
          .fillStyle(dx % 8 === 0 ? 0x94b0c2 : 0x566c86)
          .fillRect(x + dx - 12, y, 4, 46);
    } else if (kind === 'pianist') {
      scenery
        .fillStyle(0x94b0c2)
        .fillRect(x - 19, y - 12, 38, 24)
        .fillStyle(0x1a1c2c)
        .fillRect(x - 15, y - 9, 8, 18)
        .fillRect(x - 7, y - 3, 12, 6)
        .fillCircle(x + 8, y, 5)
        .fillStyle(0x6ab08a)
        .fillRect(x - 13, y - 7, 4, 14);
    } else if (kind === 'peacock') {
      scenery
        .fillStyle(0x257179)
        .fillTriangle(x - 11, y - 9, x + 11, y - 9, x, y + 8)
        .fillStyle(0xa7f070)
        .fillCircle(x - 6, y - 6, 2)
        .fillCircle(x + 6, y - 6, 2)
        .fillStyle(0x3b5dc9)
        .fillRect(x - 2, y - 4, 4, 13);
    } else if (kind === 'squirrel') {
      scenery
        .fillStyle(0xa65e46)
        .fillRect(x - 4, y - 1, 8, 5)
        .fillRect(x - 7, y - 5, 4, 6)
        .fillRect(x + 3, y - 3, 4, 4);
    } else if (kind === 'palace-reflection') {
      for (let i = 0; i < 5; i++)
        scenery
          .fillStyle(0xf4f4f4, 0.42 - i * 0.07)
          .fillRect(x + i * 10, y + i * 5, 192 - i * 20, 3);
      centers.push({ x: x + 192, y });
    }
  }
  return {
    neons,
    chunks: cacheMapGraphics(
      scene,
      scenery,
      mapId + '-scenery',
      map.widthInPixels,
      map.heightInPixels,
      centers,
      32,
    ),
  };
}
