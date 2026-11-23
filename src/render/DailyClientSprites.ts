import type { GameObjects, Scene, Textures } from 'phaser';
import type { DailyOrder } from '../gameplay/procedural/orders';
import { dailyClientSpriteSize, drawDailyClientSprite } from './dailyClientArt';
import { PixelTile } from './PixelTile';

const textureKey = 'daily-clients';

export class DailyClientSprites {
  private images: GameObjects.Image[] = [];
  private texture?: Textures.CanvasTexture;
  private ids: string[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly metersPerPixel: number,
  ) {}

  show(orders: readonly DailyOrder[]) {
    const byClient = new Map(orders.map((order) => [order.client.id, order]));
    const ids = [...byClient.keys()];
    if (
      ids.length === this.ids.length &&
      ids.every((id, i) => id === this.ids[i])
    )
      return;
    this.destroy();
    this.ids = ids;
    if (!byClient.size) return;

    const size = dailyClientSpriteSize;
    const texture = this.scene.textures.createCanvas(
      textureKey,
      size * byClient.size,
      size,
    );
    if (!texture) throw new Error(`Texture already exists: ${textureKey}`);
    this.texture = texture;
    Array.from(byClient.values()).forEach(
      ({ client, clientPosition: point }, index) => {
        const offset = size * index;
        const frame = texture.context.createImageData(size, size);
        drawDailyClientSprite(new PixelTile(frame), client);
        texture.context.putImageData(frame, offset, 0);
        texture.add(client.id, 0, offset, 0, size, size);
        this.images.push(
          this.scene.add
            .image(
              point.x / this.metersPerPixel,
              point.y / this.metersPerPixel,
              textureKey,
              client.id,
            )
            .setDepth(16),
        );
      },
    );
    texture.refresh();
  }

  cull(
    centerX: number,
    centerY: number,
    halfWidth: number,
    halfHeight: number,
  ) {
    const reach = dailyClientSpriteSize / 2;
    for (const image of this.images) {
      const visible =
        Math.abs(image.x - centerX) <= halfWidth + reach &&
        Math.abs(image.y - centerY) <= halfHeight + reach;
      if (image.visible !== visible) image.setVisible(visible);
    }
  }

  destroy() {
    for (const image of this.images) image.destroy();
    this.images = [];
    this.texture?.destroy();
    this.texture = undefined;
    this.ids = [];
  }
}
