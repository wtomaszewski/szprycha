import type { Cameras, Scene } from 'phaser';
import type { Rider } from '../gameplay/bicycle';
import type { Weather } from '../rules/types';
import { artHash } from './artFrames';
import type { Blocks } from './Blocks';
import type { readProps } from './CityProps';
import { EFFECT_TILE, effectFrame, sceneDepth } from './effectFrames';

const trailLength = 8;

export class CityAtmosphere {
  private readonly precipitation;
  private readonly fog;
  private readonly warnings;
  private steep = false;
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
  private reduced = false;
  private weather: Weather = 'clear';
  private precipitationFrame = effectFrame.rain;

  constructor(
    scene: Scene,
    private readonly blocks: Blocks,
    props: ReturnType<typeof readProps>,
    private readonly onPigeon: (at: number) => void,
  ) {
    this.precipitation = scene.add
      .tileSprite(0, 0, 1, 1, 'city-effects', effectFrame.rain)
      .setDepth(sceneDepth.weather)
      .setVisible(false);
    this.fog = scene.add
      .image(0, 0, 'city-effects', effectFrame.fog)
      .setDepth(sceneDepth.weather)
      .setVisible(false);
    this.warnings = scene.add.graphics().setDepth(sceneDepth.weather + 1);
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
    weather: Weather,
    lite: boolean,
    reduced: boolean,
    showTrail: boolean,
    reviewing: boolean,
    steep: boolean,
  ) {
    const staticEffects = reduced || lite || reviewing;
    const tick = Math.floor(at * 12);
    if (tick < this.tick) this.reset();
    const update =
      tick !== this.tick ||
      staticEffects !== this.staticEffects ||
      reduced !== this.reduced ||
      weather !== this.weather;
    const wet = weather === 'rain_light' || weather === 'rain_heavy';
    const snow = weather === 'snow';
    const fog = weather === 'fog' || weather === 'fog_dense';
    const x = camera.scrollX + camera.width / 2;
    const y = camera.scrollY + camera.height / 2;
    const width = Math.ceil(camera.width / camera.zoom) + 4;
    const height = Math.ceil(camera.height / camera.zoom) + 4;
    this.precipitation.setVisible(wet || snow);
    this.puddles.setVisible(wet);
    this.fog.setVisible(fog);
    if (fog)
      this.fog
        .setPosition(x, y)
        .setDisplaySize(width, height)
        .setAlpha(
          (weather === 'fog_dense' ? 0.88 : 0.43) * (reduced ? 0.65 : 1),
        );
    if (fog || steep) {
      this.warnings.setPosition(Math.round(rider.x), Math.round(rider.y) - 32);
    }
    if (weather !== this.weather || steep !== this.steep) {
      this.drawWarnings(fog, steep);
      this.steep = steep;
    }
    if (wet || snow) {
      this.precipitation.setPosition(x, y);
      if (
        this.precipitation.width !== width ||
        this.precipitation.height !== height
      )
        this.precipitation.setSize(width, height);
      if (update) {
        const frame = snow ? effectFrame.snow : effectFrame.rain;
        if (this.precipitationFrame !== frame) {
          this.precipitation.setFrame(frame);
          this.precipitationFrame = frame;
        }
        const phase = staticEffects
          ? 0
          : (tick * (snow ? 2 : 10)) % (EFFECT_TILE * (snow ? 4 : 2));
        this.precipitation
          .setAlpha(reduced ? 0.35 : weather === 'rain_light' ? 0.53 : 0.92)
          .setTileScale(lite || reduced ? 1.5 : 1)
          .setTilePosition(-Math.floor(phase / (snow ? 4 : 2)), -phase);
        if (wet) this.drawPuddles(camera, night);
      }
    }
    if (update) {
      this.drawAmbient(camera, rider, at, staticEffects, lite, reviewing);
      this.tick = tick;
      this.staticEffects = staticEffects;
      this.reduced = reduced;
      this.weather = weather;
    }
    this.drawTrail(rider, at, showTrail && !reviewing, staticEffects, update);
  }

  private drawWarnings(fog: boolean, steep: boolean) {
    const art = this.warnings.clear();
    if (fog) {
      const x = -15;
      art
        .fillStyle(0x1a1c2c)
        .fillRect(x - 12, -9, 24, 18)
        .fillStyle(0xf4f4f4)
        .fillRect(x - 6, -5, 15, 2)
        .fillRect(x - 9, -1, 15, 2)
        .fillRect(x - 6, 3, 15, 2);
    }
    if (steep) {
      const x = 15;
      art
        .fillStyle(0x1a1c2c)
        .fillRect(x - 12, -9, 24, 18)
        .lineStyle(2, 0xf4f4f4)
        .lineBetween(x - 8, -5, x + 7, 4)
        .lineBetween(x + 7, 4, x + 7, -2)
        .lineBetween(x + 7, 4, x + 1, 5);
    }
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
