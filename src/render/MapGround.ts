import type { GameObjects, Scene, Tilemaps } from 'phaser';

const chunkTiles = 16;

/** Rasterize the two static layers once, in chunks that can be culled by the camera. */
export function drawMapGround(
  scene: Scene,
  map: Tilemaps.Tilemap,
  tiles: Tilemaps.Tileset,
  mapId: string,
) {
  const ground = map.getLayer('ground');
  const markings = map.getLayer('markings');
  const source = scene.textures.get(tiles.name).getSourceImage();
  if (!(source instanceof HTMLImageElement))
    throw new Error('Missing map tilesheet image');
  const { tileWidth, tileHeight } = map;

  for (let row = 0; row < map.height; row += chunkTiles)
    for (let col = 0; col < map.width; col += chunkTiles) {
      const name = `ground-${mapId}-${col}-${row}`;
      if (!scene.textures.exists(name)) {
        const rows = Math.min(chunkTiles, map.height - row);
        const columns = Math.min(chunkTiles, map.width - col);
        const chunk = scene.textures.createCanvas(
          name,
          columns * tileWidth,
          rows * tileHeight,
        );
        if (!chunk) throw new Error(`Cannot create ground texture ${name}`);
        const ctx = chunk.context;
        for (const layer of [ground, markings]) {
          if (!layer) continue;
          for (let dy = 0; dy < rows; dy++)
            for (let dx = 0; dx < columns; dx++) {
              const tile = layer.data[row + dy]?.[col + dx];
              if (!tile || tile.index < 1) continue;
              const from = tiles.getTileTextureCoordinates(tile.index) as {
                x: number;
                y: number;
              } | null;
              if (!from) continue;
              ctx.drawImage(
                source,
                from.x,
                from.y,
                tileWidth,
                tileHeight,
                dx * tileWidth,
                dy * tileHeight,
                tileWidth,
                tileHeight,
              );
            }
        }
        chunk.refresh();
      }
      scene.add.image(col * tileWidth, row * tileHeight, name).setOrigin(0);
    }
}

/** Keep static vector scenery in camera-cullable textures, like the tile layers. */
export function cacheMapGraphics(
  scene: Scene,
  source: GameObjects.Graphics,
  key: string,
  width: number,
  height: number,
) {
  const chunkSize = chunkTiles * 32;
  const depth = source.depth;
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
      scene.add.image(x, y, name).setOrigin(0).setDepth(depth);
    }
  source.destroy();
}
