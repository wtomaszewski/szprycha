import type { Cameras, Scene } from 'phaser';
import type { Rider } from '../gameplay/bicycle';
import { artHash } from './artFrames';
import type { Blocks } from './Blocks';
import type { readProps } from './CityProps';
import { EFFECT_TILE, effectFrame, sceneDepth } from './effectFrames';

const trailLength = 8;

export class CityAtmosphere {
  private readonly rain;
  private readonly puddles;
  private readonly ambient;
  private readonly trail;
  private readonly drops;
  private readonly birds;
  private readonly tracks = Array.from({ length: trailLength }, () => ({
    x: 0,
    y: 0,
    at: -Infinity,
  }));
  private track = 0;
  private tick = -1;
  private staticEffects = false;
  private wet = false;

  constructor(
    scene: Scene,
    private readonly blocks: Blocks,
    props: ReturnType<typeof readProps>,
    private readonly onPigeon: (at: number) => void,
  ) {
    this.rain = scene.add
      .tileSprite(0, 0, 1, 1, 'city-effects', effectFrame.rain)
      .setDepth(sceneDepth.rain)
      .setAlpha(0.9)
      .setVisible(false);
    this.puddles = scene.add
      .graphics()
      .setDepth(sceneDepth.weatherGround)
      .setVisible(false);
    this.ambient = scene.add.graphics().setDepth(sceneDepth.atmosphere);
    this.trail = scene.add.graphics().setDepth(18).setVisible(false);
    this.drops = props.filter(({ kind }) => kind === 'lamp');
    this.birds = props
      .filter(({ kind }) => kind === 'tree')
      .filter((_, i) => i % 3 === 1)
      .map(({ x, y }) => ({
        x: x + 18,
        y: y - 13,
        takeoff: -Infinity,
        nearby: false,
      }));
  }

  reset() {
    this.tick = -1;
    this.trail.setVisible(false);
    for (const mark of this.tracks) mark.at = -Infinity;
    for (const bird of this.birds) {
      bird.takeoff = -Infinity;
      bird.nearby = false;
    }
  }

  draw(
    camera: Cameras.Scene2D.Camera,
    rider: Rider,
    at: number,
    night: boolean,
    wet: boolean,
    lite: boolean,
    reduced: boolean,
    showTrail: boolean,
    reviewing: boolean,
  ) {
    const staticEffects = reduced || lite || reviewing;
    const tick = Math.floor(at * 12);
    if (tick < this.tick) this.reset();
    const update =
      tick !== this.tick ||
      staticEffects !== this.staticEffects ||
      wet !== this.wet;
    this.rain.setVisible(wet);
    this.puddles.setVisible(wet);
    if (wet) {
      const width = Math.ceil(camera.width / camera.zoom) + 4;
      const height = Math.ceil(camera.height / camera.zoom) + 4;
      this.rain.setPosition(
        camera.scrollX + camera.width / 2,
        camera.scrollY + camera.height / 2,
      );
      if (this.rain.width !== width || this.rain.height !== height)
        this.rain.setSize(width, height);
      if (update) {
        const phase = staticEffects
          ? 0
          : Math.floor(at * 90) % (EFFECT_TILE * 2);
        this.rain
          .setTileScale(lite ? 1.5 : 1)
          .setTilePosition(-Math.floor(phase / 2), -phase);
        this.drawPuddles(camera, night);
      }
    }
    if (update) {
      this.drawAmbient(camera, rider, at, staticEffects, lite, reviewing);
      this.tick = tick;
      this.staticEffects = staticEffects;
      this.wet = wet;
    }
    this.drawTrail(rider, at, showTrail && !reviewing, staticEffects, update);
  }

  private drawPuddles(camera: Cameras.Scene2D.Camera, night: boolean) {
    const ctx = this.puddles.clear();
    const cx = camera.scrollX + camera.width / 2;
    const cy = camera.scrollY + camera.height / 2;
    const halfW = camera.width / (2 * camera.zoom) + 50;
    const halfH = camera.height / (2 * camera.zoom) + 50;
    for (const { x, y, turn } of this.drops) {
      if (Math.abs(x - cx) > halfW || Math.abs(y - cy) > halfH) continue;
      const px = x + (turn === 0 ? 18 : -18);
      const py = y + 16;
      ctx
        .fillStyle(0x29366f, 0.58)
        .fillEllipse(px, py, 34, 12)
        .fillStyle(0x41a6f6, 0.48)
        .fillRect(px - 12, py - 1, 23, 2)
        .fillStyle(night ? 0xffcd75 : 0x73eff7, 0.72)
        .fillRect(px - 5, py + 1, 11, 2);
    }
  }

  private drawAmbient(
    camera: Cameras.Scene2D.Camera,
    rider: Rider,
    at: number,
    still: boolean,
    lite: boolean,
    reviewing: boolean,
  ) {
    const art = this.ambient.clear();
    const cx = camera.scrollX + camera.width / 2;
    const cy = camera.scrollY + camera.height / 2;
    const halfW = camera.width / (2 * camera.zoom) + 35;
    const halfH = camera.height / (2 * camera.zoom) + 35;
    let chimneys = 0;
    for (const chimney of this.blocks.chimneys) {
      if (!chimney.roof.visible) continue;
      const x = chimney.roof.x + chimney.x;
      const y = chimney.roof.y + chimney.y;
      if (Math.abs(x - cx) > halfW || Math.abs(y - cy) > halfH) continue;
      if (chimneys++ >= (lite ? 3 : 9)) break;
      const seed = artHash(chimney.x, chimney.y) % 9;
      for (let i = 0; i < (lite ? 2 : 3); i++) {
        const age = still ? 0.18 + i * 0.22 : (at * 0.5 + i / 3 + seed / 9) % 1;
        const side = age * 8;
        const size = 4 + Math.floor(age * 7);
        art
          .fillStyle(i % 2 ? 0xc0cbdc : 0x94b0c2, 0.68 * (1 - age))
          .fillRect(
            Math.round(x + side),
            Math.round(y - age * 25),
            size,
            size - 1,
          );
      }
    }

    for (const bird of this.birds) {
      if (Math.abs(bird.x - cx) > halfW || Math.abs(bird.y - cy) > halfH) {
        bird.nearby = false;
        continue;
      }
      const nearby = Math.hypot(rider.x - bird.x, rider.y - bird.y) < 67;
      if (nearby && !bird.nearby) {
        bird.takeoff = at;
        if (!reviewing) this.onPigeon(at);
      }
      bird.nearby = nearby;
      const age = at - bird.takeoff;
      const flying = !still && age >= 0 && age < 1.25;
      if (!still && !flying && nearby) continue;
      for (let i = 0; i < (lite ? 2 : 3); i++) {
        const x = Math.round(
          bird.x + i * 9 + (flying ? age * (44 + i * 7) : 0),
        );
        const y = Math.round(
          bird.y + (i % 2) * 7 - (flying ? age * (32 + i * 4) : 0),
        );
        const wing = flying && Math.floor(age * 8) % 2 ? 3 : 1;
        art
          .fillStyle(0x333c57)
          .fillRect(x - 3, y + 1, 7, 3)
          .fillStyle(0xc2c3c7)
          .fillRect(x, y, 2, 4)
          .fillStyle(0x566c86)
          .fillRect(x - 2, y + wing, 6, 2);
      }
    }
  }

  private drawTrail(
    rider: Rider,
    at: number,
    active: boolean,
    still: boolean,
    update: boolean,
  ) {
    if (!active || rider.speed <= 1) {
      if (this.trail.visible) {
        this.trail.setVisible(false);
        for (const mark of this.tracks) mark.at = -Infinity;
      }
      return;
    }
    this.trail.setVisible(true);
    const art = this.trail.clear();
    if (still) {
      art
        .fillStyle(0xffcd75, 0.72)
        .fillEllipse(Math.round(rider.x), Math.round(rider.y), 26, 16);
      return;
    }
    if (update) {
      const mark = this.tracks[this.track % trailLength]!;
      this.track++;
      mark.x = Math.round(rider.x);
      mark.y = Math.round(rider.y);
      mark.at = at;
    }
    for (const mark of this.tracks) {
      const age = (at - mark.at) * 2;
      if (age >= 0 && age < 1)
        art
          .fillStyle(0xffcd75, (1 - age) * 0.65)
          .fillRect(mark.x - 3, mark.y - 3, 6, 6);
    }
  }
}
