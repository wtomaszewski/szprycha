import type { GameObjects, Scene } from 'phaser';
import type { ReplayFrame } from '../gameplay/ReplayBuffer';
import {
  helmetColors,
  riderDirections,
  riderPose,
  riderPoses,
  spriteDirection,
  type HelmetColor,
} from './spriteFrames';

export class RiderArt {
  private readonly image: GameObjects.Image;
  private readonly lights: GameObjects.Image;
  private readonly effects: GameObjects.Graphics;
  private readonly helmet: number;
  private hadEffects = false;

  constructor(scene: Scene, helmet: HelmetColor) {
    this.helmet = helmetColors.indexOf(helmet);
    this.image = scene.add.image(0, 0, 'rider', 0).setScale(2).setDepth(20);
    this.lights = scene.add
      .image(0, 0, 'rider-lights', 0)
      .setScale(2)
      .setDepth(21)
      .setVisible(false);
    this.effects = scene.add.graphics().setDepth(19);
  }

  draw(frame: ReplayFrame, reflected: boolean) {
    const { rider, actions, at, dusk } = frame;
    const x = Math.round(rider.x);
    const y = Math.round(rider.y);
    const heading = spriteDirection(rider.heading, riderDirections);
    const sinceDismount = at - frame.dismountAt;
    const dismount =
      sinceDismount < 0.34 ? Math.floor(sinceDismount / 0.17) : -1;
    const stride = rider.speed > 0 ? Math.floor(frame.riderStride) : 1;
    const pose = riderPose(
      stride,
      actions.signal,
      actions.looking,
      rider.walking,
      dismount,
    );
    const index = (this.helmet * riderPoses + pose) * riderDirections + heading;
    this.image.setPosition(x, y);
    if (Number(this.image.frame.name) !== index) this.image.setFrame(index);
    const show = actions.lights || reflected;
    if (this.lights.visible !== show) this.lights.setVisible(show);
    if (show) {
      const row =
        (dismount >= 0 ? (2 + dismount) * 4 : rider.walking ? 4 : 0) +
        (actions.lights ? 1 : 0) +
        (reflected ? 2 : 0);
      const index = row * riderDirections + heading;
      this.lights.setPosition(x, y);
      if (Number(this.lights.frame.name) !== index) this.lights.setFrame(index);
    }
    const beam = actions.lights && dusk;
    if (!beam && !actions.bell && !this.hadEffects) return;
    this.hadEffects = beam || actions.bell;
    const art = this.effects
      .clear()
      .setPosition(x, y)
      .setRotation(rider.heading);
    if (beam) {
      const side = rider.walking ? -7 : 0;
      art
        .fillStyle(0xf4f4f4, 0.28)
        .fillTriangle(17, side, 66, side - 19, 66, side + 19);
    }
    if (actions.bell)
      art
        .lineStyle(2, 0xffcd75)
        .strokeCircle(0, 0, 28 + (Math.floor(Math.max(at, 0) * 10) % 6));
  }
}
