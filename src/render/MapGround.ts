import type { Cameras, GameObjects, Scene, Tilemaps } from 'phaser';
import type { Vec2 } from '../rules/types';
import type { WorldModel } from '../rules/world/WorldModel';
import { paintBlockShadows, sheetImage } from './BlockArt';
import { paintPropShadows, type readProps } from './CityProps';
import type { Block } from './projection';
import { paintRoad, stamp } from './GroundPaint';
import { TILE, tiles, winterTile } from './artFrames';

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

/** Rasterize static layers as their chunks enter the camera view. */
export function drawMapGround(
  scene: Scene,
  map: Tilemaps.Tilemap,
  mapId: string,
  world: WorldModel,
  blocks: readonly Block[],
  props: ReturnType<typeof readProps>,
  snow: boolean,
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
  const chunks: {
    image: GameObjects.Image;
    col: number;
    row: number;
    width: number;
    height: number;
    name: string;
    prepared: boolean;
  }[] = [];

  for (let row = 0; row < map.height; row += chunkTiles)
    for (let col = 0; col < map.width; col += chunkTiles) {
      const base = `ground-${mapId}-${col}-${row}`;
      const name = snow ? base + '-snow' : base;
      const previous = snow ? base : base + '-snow';
      // Keep one set of ground textures per map when changing seasons.
      if (scene.textures.exists(previous)) scene.textures.remove(previous);
      const rows = Math.min(chunkTiles, map.height - row);
      const columns = Math.min(chunkTiles, map.width - col);
      const width = columns * TILE;
      const height = rows * TILE;
      const prepared = scene.textures.exists(name);
      const image = scene.add
        .image(col * TILE, row * TILE, prepared ? name : '__DEFAULT')
        .setOrigin(0)
        .setVisible(false);
      chunks.push({ image, col, row, width, height, name, prepared });
    }

  const update = (camera: Cameras.Scene2D.Camera) => {
    const view = mapView(camera);
    for (const chunk of chunks) {
      const { image, col, row, width, height, name } = chunk;
      const visible = inView(view, image.x, image.y, width, height);
      if (visible && !chunk.prepared) {
        const texture = scene.textures.createCanvas(name, width, height);
        if (!texture) throw new Error(`Cannot create ground texture ${name}`);
        const ctx = texture.context;
        const rows = height / TILE;
        const columns = width / TILE;
        for (const [index, layer] of layers.entries()) {
          if (!layer) continue;
          for (let dy = 0; dy < rows; dy++)
            for (let dx = 0; dx < columns; dx++) {
              const gid = layer.data[row + dy]?.[col + dx]?.index ?? 0;
              if (gid > 0 && (index !== 0 || gid !== tiles.water[0]))
                stamp(
                  ctx,
                  source,
                  snow && index === 0 ? winterTile(gid) : gid,
                  dx * TILE,
                  dy * TILE,
                );
            }
        }
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        ctx.translate(-col * TILE, -row * TILE);
        paintBlockShadows(ctx, blocks, col * TILE, row * TILE, width, height);
        paintPropShadows(ctx, props, col * TILE, row * TILE, width, height);
        paintRoad(
          ctx,
          source,
          world,
          islands,
          collisions,
          curbAt ?? undefined,
          snow,
          { x: col * TILE, y: row * TILE, width, height },
        );
        ctx.restore();
        texture.refresh();
        image.setTexture(name);
        chunk.prepared = true;
      }
      if (image.visible !== visible) image.setVisible(visible);
    }
  };
  return { update, water: drawWater(scene, source, layers[0] ?? null) };
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

function mapView(camera: Cameras.Scene2D.Camera) {
  const centerX = camera.clampX(camera.scrollX) + camera.width / 2;
  const centerY = camera.clampY(camera.scrollY) + camera.height / 2;
  const halfWidth = camera.width / (2 * camera.zoom) + TILE;
  const halfHeight = camera.height / (2 * camera.zoom) + TILE;
  return {
    left: centerX - halfWidth,
    right: centerX + halfWidth,
    top: centerY - halfHeight,
    bottom: centerY + halfHeight,
  };
}

function inView(
  view: ReturnType<typeof mapView>,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return (
    x + width >= view.left &&
    x <= view.right &&
    y + height >= view.top &&
    y <= view.bottom
  );
}

export function cullMapChunks(
  chunks: readonly GameObjects.Image[],
  camera: Cameras.Scene2D.Camera,
) {
  const view = mapView(camera);
  for (const chunk of chunks) {
    const visible = inView(view, chunk.x, chunk.y, chunk.width, chunk.height);
    if (chunk.visible !== visible) chunk.setVisible(visible);
  }
}
