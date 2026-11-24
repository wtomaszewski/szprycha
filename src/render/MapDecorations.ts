import type { Scene, Tilemaps } from 'phaser';
import { cacheMapGraphics } from './MapGround';
import type { Neon } from './NightLighting';
import { TownHallGoats } from './TownHallGoats';

export function drawMapDecorations(
  scene: Scene,
  map: Tilemaps.Tilemap,
  mapId: string,
  missionId?: string,
) {
  const neons: Neon[] = [];
  let townHallGoats: TownHallGoats | undefined;
  const peacocks: { x: number; y: number }[] = [];
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
    if (kind === 'giewont') {
      scene.add
        .image(x, y, 'giewont')
        .setOrigin(0.5, 1)
        .setScrollFactor(0.86, 1)
        .setDepth(2);
      continue;
    }
    if (kind === 'poznan-koziolki') {
      townHallGoats = new TownHallGoats(scene, x, y);
      continue;
    }
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
    if (kind === 'fallen-bike') {
      const mission = properties?.find(
        (p: { name: string; value: unknown }) => p.name === 'mission',
      )?.value;
      if (mission !== missionId) continue;
      // Mission scenery lives on the scene so the shared map cache cannot reuse it.
      scene.add
        .graphics()
        .setDepth(4)
        .lineStyle(2, 0x1a1c2c)
        .strokeCircle(x - 16, y, 5)
        .strokeCircle(x + 2, y + 5, 5)
        .lineStyle(2, 0xb13e53)
        .lineBetween(x - 16, y, x - 6, y + 5)
        .lineBetween(x - 6, y + 5, x - 8, y - 4)
        .lineBetween(x - 8, y - 4, x + 2, y + 5)
        .fillStyle(0x1a1c2c)
        .fillRect(x + 10, y + 1, 10, 8)
        .fillStyle(0x3b5dc9)
        .fillRect(x + 11, y - 4, 9, 9)
        .fillStyle(0xe8c39e)
        .fillCircle(x + 16, y - 6, 4)
        .fillStyle(0x41a6f6)
        .fillRect(x + 12, y - 10, 8, 3);
      continue;
    }
    centers.push({ x, y });
    if (kind === 'field-rows') {
      scenery.fillStyle(0x76513b).fillRect(x, y, width, height);
      for (let dx = 8; dx < width - 8; dx += 12) {
        scenery.fillStyle(0xa9794f).fillRect(x + dx, y + 6, 7, height - 12);
        for (let dy = 12; dy < height - 8; dy += 10) {
          scenery
            .fillStyle(dy % 20 === 2 ? 0xa7c974 : 0x849b54)
            .fillRect(x + dx + (dy % 3), y + dy, 5, 3);
        }
        for (let dy = 0; dy <= height; dy += 32)
          centers.push({ x: x + dx, y: y + dy });
      }
    } else if (kind === 'school-gate') {
      scenery
        .lineStyle(4, 0x805b43)
        .lineBetween(x, y - 44, x, y - 18)
        .lineBetween(x, y + 18, x, y + 44);
      for (const offset of [-44, -18, 18, 44])
        scenery
          .fillStyle(0x4d3c37)
          .fillRect(x - 3, y + offset - 3, 7, 7)
          .fillStyle(0xc69063)
          .fillRect(x - 2, y + offset - 2, 5, 4);
    } else if (kind === 'zakopane-mur') {
      scenery.fillStyle(0x333c57).fillRect(x, y, width, height);
      for (let row = 0; row < height; row += 8) {
        scenery
          .fillStyle(row % 16 ? 0x8b8581 : 0xaaa49b)
          .fillRect(x + 2, y + row, width - 4, 6)
          .fillStyle(0x566c86)
          .fillRect(x + (row % 16 ? 9 : 15), y + row, 2, 6);
        if (row % 32 === 0) centers.push({ x, y: y + row });
      }
    } else if (kind === 'kladka-drewniana') {
      scenery.fillStyle(0x9b7352).fillRect(x, y, width, height);
      for (let dy = 2; dy < height - 2; dy += 8) {
        scenery
          .fillStyle(dy % 16 === 2 ? 0xd9b48a : 0xb48661)
          .fillRect(x + 5, y + dy, width - 10, 6);
        centers.push({ x: x + width / 2, y: y + dy });
      }
      for (const side of [x, x + width - 5])
        scenery.fillStyle(0x4d3c37).fillRect(side, y, 5, height);
    } else if (kind === 'stocznia-dzwig') {
      const top = y - height;
      const jib = top + 36;
      const steel = 0x558468;
      scenery
        .fillStyle(0x333c57)
        .fillRect(x - 13, y - 8, 26, 16)
        .lineStyle(5, steel)
        .lineBetween(x - 10, y, x - 10, top)
        .lineBetween(x + 10, y, x + 10, top)
        .lineBetween(x - 40, jib - 16, x + width, jib)
        .lineBetween(x, jib - 9, x + width, jib + 12)
        .lineStyle(2, 0x9da890)
        .lineBetween(x, top, x + width - 24, jib)
        .lineBetween(x + width - 12, jib + 8, x + width - 12, jib + 59)
        .fillStyle(0xcdad68)
        .fillRect(x + width - 16, jib + 59, 8, 5)
        .fillRect(x - 13, top - 3, 26, 9);
      for (let dy = 4; dy < height - 20; dy += 20)
        scenery
          .lineStyle(2, steel)
          .lineBetween(x - 10, y - dy, x + 10, y - dy - 10)
          .lineBetween(x + 10, y - dy - 10, x - 10, y - dy - 20);
      for (let dx = -28; dx < width; dx += 48)
        centers.push({ x: x + dx, y: jib });
      for (let dy = 0; dy < height; dy += 56) centers.push({ x, y: y - dy });
    } else if (kind === 'morska-piana') {
      scenery.fillStyle(0x65bfb6).fillRect(x, y, width, 4);
      for (let dx = 0; dx < width - 16; dx += 36) {
        scenery.fillStyle(0xc1e4cb).fillRect(x + dx, y + 2 + (dx % 5), 13, 2);
        centers.push({ x: x + dx, y });
      }
    } else if (kind === 'piasek-na-asfalcie') {
      for (let i = 0; i < 15; i++)
        scenery
          .fillStyle(i % 3 ? 0xb39c75 : 0xd9b48a)
          .fillRect(x + ((i * 13) % 55), y + ((i * 5) % 12), 4 + (i % 4), 1);
    } else if (kind === 'truss-bridge') {
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
    } else if (kind === 'fountain' || kind === 'gdansk-fontanna') {
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
      if (kind === 'gdansk-fontanna')
        scenery
          .fillStyle(0xd9b48a)
          .fillCircle(x, y + 3, 8)
          .fillStyle(0x487b62)
          .fillRect(x - 3, y - 18, 6, 21)
          .fillCircle(x, y - 20, 4)
          .lineStyle(2, 0x487b62)
          .lineBetween(x + 8, y + 7, x + 12, y - 25)
          .lineBetween(x + 8, y - 23, x + 15, y - 23);
    } else if (kind === 'poznan-peron') {
      scenery
        .fillStyle(0x333c57)
        .fillRect(x, y, width, height)
        .fillStyle(0xc0cbdc)
        .fillRect(x + 2, y, width - 4, height - 2)
        .fillStyle(0xf0dca8)
        .fillRect(x + 3, y, 2, height);
      for (let dy = 8; dy < height; dy += 16) {
        scenery.fillStyle(0x94b0c2).fillRect(x + 7, y + dy, width - 10, 1);
        centers.push({ x, y: y + dy });
      }
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
    } else if (kind === 'wawel-mur-oporowy') {
      scenery.fillStyle(0x5a3a2e).fillRect(x, y + 5, width, height - 5);
      scenery.fillStyle(0xd9b48a).fillRect(x, y, width, 12);
      for (let dx = 0; dx < width; dx += 24) {
        scenery
          .fillStyle(dx % 48 ? 0x9b7352 : 0xb48661)
          .fillRect(x + dx + 2, y + 13, 21, 10);
        scenery.fillStyle(0x8b6d5c).fillRect(x + dx + 8, y + 25, 16, 9);
        centers.push({ x: x + dx + 12, y: y + 16 });
      }
    } else if (kind === 'smok-wawelski') {
      scenery.fillStyle(0x8b6d5c).fillEllipse(x, y + 4, 63, 32);
      scenery.fillStyle(0xc1a486).fillEllipse(x, y, 58, 25);
      scenery.fillStyle(0x254c44).fillPoints(
        [
          [-25, 5],
          [-20, -4],
          [-8, -1],
          [-4, -13],
          [-19, -33],
          [0, -27],
          [5, -19],
          [9, -36],
          [23, -41],
          [21, -33],
          [32, -31],
          [30, -23],
          [19, -22],
          [15, -6],
          [26, 0],
          [26, 8],
          [14, 8],
          [8, 1],
          [1, 10],
          [-10, 10],
          [-8, 3],
          [-17, 7],
        ].map(([dx, dy]) => ({ x: x + dx!, y: y + dy! })),
        true,
      );
      scenery
        .fillStyle(0x6ab08a)
        .fillTriangle(x - 16, y - 30, x + 3, y - 21, x - 3, y - 12);
      scenery.fillStyle(0xa7c974).fillRect(x + 21, y - 32, 3, 2);
      centers.push({ x, y: y - 36 });
    } else if (kind === 'kopiec') {
      for (const [offset, w, h, tone] of [
        [12, 258, 87, 0x254c44],
        [5, 236, 70, 0x3e8948],
        [-14, 194, 64, 0x559859],
        [-31, 155, 56, 0x6ab069],
        [-49, 109, 48, 0x80bd72],
        [-65, 48, 31, 0xa7c974],
      ] as const) {
        scenery.fillStyle(tone).fillEllipse(x, y + offset, w, h, 32);
        centers.push(
          { x: x - w / 2, y: y + offset },
          { x: x + w / 2, y: y + offset },
        );
      }
      scenery
        .lineStyle(5, 0xd9b48a)
        .lineBetween(x + 108, y + 20, x - 57, y + 3)
        .lineBetween(x - 57, y + 3, x + 50, y - 22)
        .lineBetween(x + 50, y - 22, x - 25, y - 44)
        .lineBetween(x - 25, y - 44, x + 6, y - 61);
      scenery.fillStyle(0xf0dca8).fillRect(x - 6, y - 72, 12, 9);
      centers.push({ x, y: y - 68 }, { x, y: y + 44 });
    } else if (kind === 'peacock') {
      peacocks.push({ x, y });
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
    peacocks,
    townHallGoats,
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
