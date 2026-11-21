import { GameObjects, Scene, Cameras } from 'phaser';
import { CAMERA_HEIGHT_PX, roofOffset, type Block } from './projection';
export type { Block } from './projection';
export class Blocks {
  cameraHeight = CAMERA_HEIGHT_PX;
  private items: {
    block: Block;
    support?: Block;
    walls: GameObjects.Graphics;
    roof: GameObjects.TileSprite;
    dx: number;
    dy: number;
    baseX: number;
    baseY: number;
  }[];
  constructor(scene: Scene, blocks: Block[]) {
    const landmarkTiers = new Map<string, Block>();
    this.items = [...blocks]
      .sort((a, b) => a.floors - b.floors)
      .map((block, i) => {
        const support = block.landmarkId
          ? landmarkTiers.get(block.landmarkId)
          : undefined;
        if (block.landmarkId) landmarkTiers.set(block.landmarkId, block);
        return {
          block,
          support,
          walls: scene.add.graphics().setDepth(100 + i * 2),
          roof: scene.add
            .tileSprite(block.x, block.y, block.width, block.height, 'roof')
            .setTint(block.landmarkId ? 0xe8c39e : 0xffffff)
            .setOrigin(0)
            .setDepth(101 + i * 2),
          dx: NaN,
          dy: NaN,
          baseX: NaN,
          baseY: NaN,
        };
      });
  }
  update(
    camera: Cameras.Scene2D.Camera,
    lite: boolean,
    playerX: number,
    playerY: number,
  ) {
    const cx = camera.scrollX + camera.width / 2,
      cy = camera.scrollY + camera.height / 2;
    const halfWidth = camera.width / (2 * camera.zoom);
    const halfHeight = camera.height / (2 * camera.zoom);
    const left = cx - halfWidth,
      right = cx + halfWidth;
    const top = cy - halfHeight,
      bottom = cy + halfHeight;
    for (const item of this.items) {
      const b = item.block,
        offset = roofOffset(b, cx, cy, lite, this.cameraHeight);
      const base = item.support
        ? roofOffset(item.support, cx, cy, lite, this.cameraHeight)
        : { x: 0, y: 0 };
      const margin =
        Math.max(
          Math.abs(offset.x),
          Math.abs(offset.y),
          Math.abs(base.x),
          Math.abs(base.y),
        ) + 32;
      const visible =
        b.x + b.width + margin > left &&
        b.x - margin < right &&
        b.y + b.height + margin > top &&
        b.y - margin < bottom;
      item.walls.setVisible(visible);
      item.roof.setVisible(visible);
      if (!visible) continue;
      const hidden =
        playerX > b.x + offset.x - 16 &&
        playerX < b.x + b.width + offset.x + 16 &&
        playerY > b.y + offset.y - 16 &&
        playerY < b.y + b.height + offset.y + 16;
      item.walls.setAlpha(hidden ? 0.35 : 1);
      item.roof.setAlpha(hidden ? 0.35 : 1);
      if (
        item.dx === offset.x &&
        item.dy === offset.y &&
        item.baseX === base.x &&
        item.baseY === base.y
      )
        continue;
      item.dx = offset.x;
      item.dy = offset.y;
      item.baseX = base.x;
      item.baseY = base.y;
      const g = item.walls.clear(),
        dx = offset.x - base.x,
        dy = offset.y - base.y,
        x = b.x + base.x,
        y = b.y + base.y,
        w = b.width,
        h = b.height;
      if (!item.support)
        g.fillStyle(0x10121e, 0.25).fillRect(
          x + 12,
          y + 12,
          w + Math.max(0, dx),
          h + Math.max(0, dy),
        );
      if (dx !== 0) {
        g.fillStyle(b.landmarkId ? 0xe8c39e : 0xc2c3c7);
        const edge = dx > 0 ? x : x + w;
        g.fillPoints(
          [
            { x: edge, y },
            { x: edge + dx, y: y + dy },
            { x: edge + dx, y: y + h + dy },
            { x: edge, y: y + h },
          ],
          true,
        );
      }
      if (dy !== 0) {
        g.fillStyle(b.landmarkId ? 0xad7655 : 0x8b6d5c);
        const edge = dy > 0 ? y : y + h;
        g.fillPoints(
          [
            { x, y: edge },
            { x: x + dx, y: edge + dy },
            { x: x + w + dx, y: edge + dy },
            { x: x + w, y: edge },
          ],
          true,
        );
      }
      g.lineStyle(1, 0x566c86);
      const floors = b.floors - (item.support?.floors ?? 0);
      for (let f = 1; f < floors; f++) {
        const t = f / floors;
        if (dy !== 0) {
          const edge = dy > 0 ? y : y + h;
          g.lineBetween(
            x + dx * t,
            edge + dy * t,
            x + w + dx * t,
            edge + dy * t,
          );
        }
        if (dx !== 0) {
          const edge = dx > 0 ? x : x + w;
          g.lineBetween(
            edge + dx * t,
            y + dy * t,
            edge + dx * t,
            y + h + dy * t,
          );
        }
      }
      item.roof.setPosition(x + dx, y + dy);
    }
  }
}
