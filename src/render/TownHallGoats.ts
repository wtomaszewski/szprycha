import type { Scene } from 'phaser';
import { sceneDepth } from './effectFrames';

const noon = 12;
const showDuration = 3;
const secondsPerGameMinute = 0.2;

export class TownHallGoats {
  private readonly art;
  private lastFrame?: number;

  constructor(scene: Scene, x: number, y: number) {
    this.art = scene.add
      .graphics()
      .setPosition(x, y)
      .setDepth(sceneDepth.atmosphere - 1);
  }

  draw(at: number, reducedMotion: boolean) {
    const phase =
      at < noon
        ? 'before-noon'
        : at < noon + showDuration
          ? 'noon'
          : 'after-noon';
    const show = phase === 'noon';
    const animationFrame =
      show && !reducedMotion ? Math.floor((at - noon) * 8) : 0;
    const gameMinute = Math.floor((at - noon) / secondsPerGameMinute);
    // The clock hand stays at twelve for the duration of the show.
    const minute = show
      ? 0
      : gameMinute - (at >= noon ? showDuration / secondsPerGameMinute : 0);
    const minuteAngle = (minute * Math.PI) / 30 - Math.PI / 2;
    const hourAngle = (minute * Math.PI) / 360 - Math.PI / 2;
    const frame = minute * 25 + animationFrame;
    if (frame === this.lastFrame) return phase;
    this.lastFrame = frame;

    const art = this.art.clear();
    art
      .fillStyle(0x5a3a2e)
      .fillRect(-38, -25, 76, 30)
      .fillStyle(0xd9b48a)
      .fillRect(-36, -24, 72, 30)
      .fillStyle(0xf0dca8)
      .fillRect(-40, 4, 80, 5)
      .fillRect(-39, -25, 78, 3)
      .fillStyle(0x4d3c37)
      .fillRect(-32, -20, 64, 20)
      .fillStyle(0x5a3a2e)
      .fillCircle(0, -34, 12)
      .fillStyle(0xf0dca8)
      .fillCircle(0, -34, 9)
      .lineStyle(2, 0x1a1c2c)
      .lineBetween(
        0,
        -34,
        Math.round(5 * Math.cos(hourAngle)),
        -34 + Math.round(5 * Math.sin(hourAngle)),
      )
      .lineBetween(
        0,
        -34,
        Math.round(7 * Math.cos(minuteAngle)),
        -34 + Math.round(7 * Math.sin(minuteAngle)),
      );

    const step = [0, 2, 5, 8, 9, 6, 3, 0][animationFrame % 8]!;
    for (const direction of [1, -1]) {
      const headX = direction * (10 - step);
      const bodyX = headX + direction * 9;
      art.fillStyle(0xc0cbdc).fillRect(Math.min(headX, bodyX) - 4, -11, 14, 7);
      art
        .fillStyle(0xf4f4f4)
        .fillRect(headX - 3, -14, 6, 6)
        .fillRect(bodyX - 4, -13, 9, 7)
        .lineStyle(2, 0xf4f4f4)
        .lineBetween(bodyX - 3, -8, bodyX - 3, -2)
        .lineBetween(bodyX + 3, -8, bodyX + 3, -2)
        .lineBetween(bodyX + direction * 4, -12, bodyX + direction * 7, -15)
        .lineStyle(2, 0xffcd75)
        .lineBetween(headX, -14, headX + direction * 3, -18)
        .fillStyle(0x1a1c2c)
        .fillRect(headX - direction - 1, -13, 2, 2);
    }
    return phase;
  }
}
