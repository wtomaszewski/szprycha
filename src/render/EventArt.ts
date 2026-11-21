import type { GameObjects, Scene } from 'phaser';
import type { ReplayProp } from '../gameplay/ReplayBuffer';
import { trafficSprite } from './TrafficArt';

export class EventArt {
  private readonly graphics: GameObjects.Graphics;
  private readonly cyclist: GameObjects.Image;
  private hasArt = false;

  constructor(scene: Scene) {
    this.graphics = scene.add.graphics().setDepth(18);
    this.cyclist = trafficSprite(scene, 'cyclist')
      .setTint(0xffae34)
      .setVisible(false);
  }

  draw(props: readonly ReplayProp[], scale: number) {
    const [ball, door, cyclist] = props;
    const visible = Boolean(ball?.active || door?.active || cyclist?.active);
    if (!visible && !this.hasArt) return;
    this.hasArt = visible;
    const art = this.graphics.clear();
    if (ball?.active) {
      const x = ball.x * scale;
      const y = ball.y * scale;
      art
        .fillStyle(0x1a1c2c)
        .fillCircle(x, y, 7)
        .fillStyle(0xf4f4f4)
        .fillCircle(x, y, 5)
        .fillStyle(0xe43b44)
        .fillCircle(x + 1, y - 1, 3);
    }
    if (door?.active) {
      const x = door.x * scale;
      const y = door.y * scale;
      const endX = x + 22 * Math.cos(door.heading);
      const endY = y + 22 * Math.sin(door.heading);
      art
        .lineStyle(7, 0x1a1c2c)
        .lineBetween(x, y, endX, endY)
        .lineStyle(3, 0xffcd75)
        .lineBetween(x, y, endX, endY);
    }
    this.cyclist.setVisible(Boolean(cyclist?.active));
    if (cyclist?.active) {
      const x = cyclist.x * scale;
      const y = cyclist.y * scale;
      this.cyclist.setPosition(x, y).setRotation(cyclist.heading);
      art.lineStyle(2, 0xffcd75).strokeCircle(x, y, 15);
    }
  }
}
