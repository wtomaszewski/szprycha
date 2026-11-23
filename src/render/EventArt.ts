import type { GameObjects, Scene } from 'phaser';
import type { ReplayProp } from '../gameplay/ReplayBuffer';
import { BALL_FRAME } from './artFrames';
import { drawCyclist } from './TrafficArt';

export class EventArt {
  private readonly graphics: GameObjects.Graphics;
  private readonly cyclist: GameObjects.Image;
  private readonly ball: GameObjects.Image;
  private hasArt = false;

  constructor(scene: Scene) {
    this.ball = scene.add
      .image(0, 0, 'props', BALL_FRAME)
      .setDepth(18)
      .setVisible(false);
    this.graphics = scene.add.graphics().setDepth(18);
    this.cyclist = scene.add
      .image(0, 0, 'traffic-cyclist', 0)
      .setDepth(17)
      .setVisible(false);
  }

  draw(props: readonly ReplayProp[], scale: number, at: number) {
    const [ball, door, cyclist] = props;
    const showBall = Boolean(ball?.active);
    if (this.ball.visible !== showBall) this.ball.setVisible(showBall);
    if (ball?.active)
      this.ball.setPosition(
        Math.round(ball.x * scale),
        Math.round(ball.y * scale),
      );
    const visible = Boolean(door?.active || cyclist?.active);
    if (!visible && !this.hasArt) return;
    this.hasArt = visible;
    const art = this.graphics.clear();
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
      this.cyclist.setPosition(Math.round(x), Math.round(y));
      drawCyclist(
        this.cyclist,
        cyclist.heading,
        (Math.max(0, at) * 2.25) % 1,
        2,
      );
      art.lineStyle(2, 0xffcd75).strokeCircle(x, y, 15);
    }
  }
}
