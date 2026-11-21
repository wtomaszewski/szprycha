import { GameObjects, Scene, Cameras } from 'phaser';
import { roofOffset, type Block } from './projection';
export type { Block } from './projection';
export class Blocks {
  private items: {
    block: Block;
    walls: GameObjects.Graphics;
    roof: GameObjects.TileSprite;
    dx: number;
    dy: number;
  }[];
  constructor(scene: Scene, blocks: Block[]) {
    this.items = blocks
      .sort((a, b) => a.floors - b.floors)
      .map((block, i) => ({
        block,
        walls: scene.add.graphics().setDepth(100 + i * 2),
        roof: scene.add
          .tileSprite(block.x, block.y, block.width, block.height, 'roof')
          .setOrigin(0)
          .setDepth(101 + i * 2),
        dx: NaN,
        dy: NaN,
      }));
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
        offset = roofOffset(b, cx, cy, lite);
      const margin = Math.max(Math.abs(offset.x), Math.abs(offset.y)) + 32;
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
      if (item.dx === offset.x && item.dy === offset.y) continue;
      item.dx = offset.x;
      item.dy = offset.y;
      const g = item.walls.clear(),
        dx = offset.x,
        dy = offset.y,
        x = b.x,
        y = b.y,
        w = b.width,
        h = b.height;
      g.fillStyle(0x10121e, 0.25).fillRect(
        x + 12,
        y + 12,
        w + Math.max(0, dx),
        h + Math.max(0, dy),
      );
      g.fillStyle(0x8b6d5c);
      if (dx !== 0) {
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
      g.fillStyle(0xc2c3c7);
      if (dy !== 0) {
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
      for (let f = 1; f < b.floors; f++) {
        const t = f / b.floors;
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
