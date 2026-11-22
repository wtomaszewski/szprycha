import type { Cameras, GameObjects, Scene, Tilemaps } from 'phaser';
import type { Vec2 } from '../rules/types';
import type { WorldModel } from '../rules/world/WorldModel';
import { paintBlockShadows, sheetImage } from './BlockArt';
import { paintPropShadows, type readProps } from './CityProps';
import type { Block } from './projection';
import { paintRoad, stamp } from './GroundPaint';
import { TILE, tiles } from './artFrames';

const chunkTiles = 16;

function waterTexture(
  scene: Scene,
  source: HTMLImageElement,
  width: number,
  height: number,
) {
  const key = `water-${width}-${height}`;
  if (!scene.textures.exists(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height * tiles.water.length;
    const ctx = canvas.getContext('2d')!;
    // Build every phase once. The timer only switches atlas frames.
    for (const [phase, gid] of tiles.water.entries())
      for (let y = 0; y < height; y += TILE)
        for (let x = 0; x < width; x += TILE)
          stamp(ctx, source, gid, x, phase * height + y);
    const texture = scene.textures.create(key, canvas)!;
    for (const phase of tiles.water.keys())
      texture.add(phase, 0, 0, phase * height, width, height);
  }
  return key;
}

function drawWater(
  scene: Scene,
  source: HTMLImageElement,
  ground: Tilemaps.LayerData | null,
) {
  if (!ground) return [];
  const [firstFrame] = tiles.water;
  const areas: { col: number; row: number; width: number; bottom: number }[] =
    [];
  const runs = new Map<string, (typeof areas)[number]>();

  // Merge matching horizontal runs into rectangles so the river tiles repeat
  // in a few draw calls while leaving the bridge deck and banks untouched.
  for (const [row, cells] of ground.data.entries()) {
    let col = 0;
    while (col < cells.length) {
      if (cells[col]?.index !== firstFrame) {
        col++;
        continue;
      }
      const start = col++;
      while (col - start < chunkTiles && cells[col]?.index === firstFrame)
        col++;
      const width = col - start;
      const key = `${start}:${width}`;
      const previous = runs.get(key);
      if (previous?.bottom === row && row - previous.row < chunkTiles) {
        previous.bottom++;
      } else {
        const area = { col: start, row, width, bottom: row + 1 };
        areas.push(area);
        runs.set(key, area);
      }
    }
  }
  if (!areas.length) return [];

  const water = areas.map(({ col, row, width, bottom }) => {
    const key = waterTexture(
      scene,
      source,
      width * TILE,
      (bottom - row) * TILE,
    );
    return scene.add
      .image(col * TILE, row * TILE, key, 0)
      .setOrigin(0)
      .setDepth(1);
  });
  let frame = 0;
  scene.time.addEvent({
    delay: 280,
    loop: true,
    callback: () => {
      frame = (frame + 1) % tiles.water.length;
      for (const area of water) area.setFrame(frame);
    },
  });
  return water;
}

/** Rasterize static layers once into camera-culled textures. */
export function drawMapGround(
  scene: Scene,
  map: Tilemaps.Tilemap,
  mapId: string,
  world: WorldModel,
  blocks: readonly Block[],
  props: ReturnType<typeof readProps>,
) {
  const layers = ['ground', 'verge', 'curb', 'markings'].map((name) =>
    map.getLayer(name),
  );
  const source = sheetImage(scene, 'training');
  const islands = map.getObjectLayer('traffic_islands')?.objects ?? [];
  const collisions = map.getObjectLayer('collisions')?.objects ?? [];
  const curb = layers[2];
  const curbAt =
    curb &&
    ((x: number, y: number, side: number) => {
      const gid =
        curb.data[Math.floor(y / TILE)]?.[Math.floor(x / TILE)]?.index ?? 0;
      return (
        gid > tiles.curbMask &&
        gid < tiles.curbMask + 16 &&
        ((gid - tiles.curbMask) & side) !== 0
      );
    });
  const chunks: GameObjects.Image[] = [];

  for (let row = 0; row < map.height; row += chunkTiles)
    for (let col = 0; col < map.width; col += chunkTiles) {
      const name = `ground-${mapId}-${col}-${row}`;
      const rows = Math.min(chunkTiles, map.height - row);
      const columns = Math.min(chunkTiles, map.width - col);
      // A two-pixel overlap covers fractional-zoom seams between texture quads.
      const padX = col + columns < map.width ? 2 : 0;
      const padY = row + rows < map.height ? 2 : 0;
      const width = columns * TILE + padX;
      const height = rows * TILE + padY;
      const existing = scene.textures.exists(name);
      const chunk = existing
        ? undefined
        : scene.textures.createCanvas(name, width, height);
      if (!existing && !chunk)
        throw new Error(`Cannot create ground texture ${name}`);
      const ctx = chunk?.context;
      if (ctx) {
        for (const [index, layer] of layers.entries()) {
          if (!layer) continue;
          for (let dy = 0; dy < rows + (padY ? 1 : 0); dy++)
            for (let dx = 0; dx < columns + (padX ? 1 : 0); dx++) {
              const gid = layer.data[row + dy]?.[col + dx]?.index ?? 0;
              if (gid > 0 && (index !== 0 || gid !== tiles.water[0]))
                stamp(ctx, source, gid, dx * TILE, dy * TILE);
            }
        }
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        ctx.translate(-col * TILE, -row * TILE);
        paintBlockShadows(ctx, blocks, col * TILE, row * TILE, width, height);
        paintPropShadows(ctx, props);
        paintRoad(ctx, source, world, islands, collisions, curbAt ?? undefined);
        ctx.restore();
        chunk?.refresh();
      }
      chunks.push(scene.add.image(col * TILE, row * TILE, name).setOrigin(0));
    }
  return [...chunks, ...drawWater(scene, source, layers[0] ?? null)];
}

/** Keep static vector scenery in camera-culled textures, like the tile layers. */
export function cacheMapGraphics(
  scene: Scene,
  source: GameObjects.Graphics,
  key: string,
  width: number,
  height: number,
  centers: readonly Vec2[],
  margin: number,
) {
  const chunkSize = chunkTiles * TILE;
  const depth = source.depth;
  const chunks: GameObjects.Image[] = [];
  source.setScrollFactor(0);
  for (let y = 0; y < height; y += chunkSize)
    for (let x = 0; x < width; x += chunkSize) {
      if (
        !centers.some(
          (point) =>
            point.x >= x - margin &&
            point.x <= x + chunkSize + margin &&
            point.y >= y - margin &&
            point.y <= y + chunkSize + margin,
        )
      )
        continue;
      const name = `${key}-${x}-${y}`;
      if (!scene.textures.exists(name))
        source
          .setPosition(-x, -y)
          .generateTexture(
            name,
            Math.min(chunkSize, width - x),
            Math.min(chunkSize, height - y),
          );
      chunks.push(scene.add.image(x, y, name).setOrigin(0).setDepth(depth));
    }
  source.destroy();
  return chunks;
}

export function cullMapChunks(
  chunks: readonly GameObjects.Image[],
  camera: Cameras.Scene2D.Camera,
) {
  const centerX = camera.clampX(camera.scrollX) + camera.width / 2;
  const centerY = camera.clampY(camera.scrollY) + camera.height / 2;
  const halfWidth = camera.width / (2 * camera.zoom) + TILE;
  const halfHeight = camera.height / (2 * camera.zoom) + TILE;
  const left = centerX - halfWidth;
  const right = centerX + halfWidth;
  const top = centerY - halfHeight;
  const bottom = centerY + halfHeight;
  for (const chunk of chunks) {
    const visible =
      chunk.x + chunk.width >= left &&
      chunk.x <= right &&
      chunk.y + chunk.height >= top &&
      chunk.y <= bottom;
    if (chunk.visible !== visible) chunk.setVisible(visible);
  }
}
