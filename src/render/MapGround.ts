import type { Cameras, GameObjects, Scene, Tilemaps } from 'phaser';
import type { WorldModel } from '../rules/world/WorldModel';
import { paintBlockShadows, sheetImage } from './BlockArt';
import { paintPropShadows, type readProps } from './CityProps';
import type { Block } from './projection';
import { paintRoad, stamp } from './GroundPaint';
import { TILE, TILE_COLUMNS, tiles } from './artFrames';

const chunkTiles = 16;

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
  const training = scene.textures.get('training');
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
  const water: GameObjects.Image[] = [];
  const chunks: GameObjects.Image[] = [];
  for (const gid of tiles.water) {
    if (!training.has(String(gid)))
      training.add(
        gid,
        0,
        ((gid - 1) % TILE_COLUMNS) * TILE,
        Math.floor((gid - 1) / TILE_COLUMNS) * TILE,
        TILE,
        TILE,
      );
  }

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
      for (const [index, layer] of layers.entries()) {
        if (!layer || (!ctx && index !== 0)) continue;
        for (let dy = 0; dy < rows + (ctx && padY ? 1 : 0); dy++)
          for (let dx = 0; dx < columns + (ctx && padX ? 1 : 0); dx++) {
            const gid = layer.data[row + dy]?.[col + dx]?.index ?? 0;
            if (gid <= 0) continue;
            if (index === 0 && gid === tiles.water[0]) {
              if (dy >= rows || dx >= columns) continue;
              water.push(
                scene.add
                  .image((col + dx) * TILE, (row + dy) * TILE, 'training', gid)
                  .setOrigin(0)
                  .setDepth(1),
              );
            } else if (ctx) stamp(ctx, source, gid, dx * TILE, dy * TILE);
          }
      }
      if (ctx) {
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
  if (water.length > 0) {
    let frame = 0;
    scene.time.addEvent({
      delay: 280,
      loop: true,
      callback: () => {
        frame = (frame + 1) % tiles.water.length;
        for (const cell of water) cell.setFrame(tiles.water[frame]!);
      },
    });
  }
  return [...chunks, ...water];
}

/** Keep static vector scenery in camera-culled textures, like the tile layers. */
export function cacheMapGraphics(
  scene: Scene,
  source: GameObjects.Graphics,
  key: string,
  width: number,
  height: number,
) {
  const chunkSize = chunkTiles * TILE;
  const depth = source.depth;
  const chunks: GameObjects.Image[] = [];
  source.setScrollFactor(0);
  for (let y = 0; y < height; y += chunkSize)
    for (let x = 0; x < width; x += chunkSize) {
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
