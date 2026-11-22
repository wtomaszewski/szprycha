import { BlendModes, type Cameras, type GameObjects, type Scene } from 'phaser';
import effectsUrl from '../../assets/generated/city-effects.png?url';
import type { Rider } from '../gameplay/bicycle';
import type { Vec2 } from '../rules/types';
import { CityProps } from './CityProps';
import { EFFECT_TILE, effectFrame, sceneDepth } from './effectFrames';

export function loadCityEffects(scene: Scene) {
  if (!scene.textures.exists('city-effects'))
    scene.load.spritesheet('city-effects', effectsUrl, {
      frameWidth: EFFECT_TILE,
      frameHeight: EFFECT_TILE,
    });
}

export type Neon = Vec2 & { color?: number; cycling?: boolean };
const neonPalette = [0x73eff7, 0xff77a8, 0xa7f070, 0xffcd75];

export class NightLighting {
  private readonly ambient;
  private readonly bike;
  private readonly lamps;
  private readonly neons;
  private readonly headlights: GameObjects.Image[] = [];
  private activeHeadlights = 0;
  private lastReflection = -Infinity;
  private lastTime = -Infinity;

  constructor(
    private readonly scene: Scene,
    props: CityProps,
    neons: readonly Neon[],
  ) {
    this.ambient = scene.add
      .rectangle(0, 0, 1, 1, 0x29366f, 0.64)
      .setDepth(sceneDepth.night)
      .setBlendMode(BlendModes.MULTIPLY)
      .setVisible(false);
    this.bike = this.image(effectFrame.bike).setOrigin(0, 0.5).setScale(0.65);
    this.lamps = props.lamps.map((lamp) => ({
      lamp,
      glow: this.image(effectFrame.lamp),
    }));
    this.neons = neons.map(({ x, y, color, cycling }) => {
      const glow = this.image(effectFrame.neon).setPosition(x, y);
      if (color !== undefined) glow.setTint(color);
      return { glow, cycling };
    });
  }

  private image(frame: number) {
    return this.scene.add
      .image(0, 0, 'city-effects', frame)
      .setDepth(sceneDepth.light)
      .setBlendMode(BlendModes.ADD)
      .setVisible(false);
  }

  drawVehicle(
    x: number,
    y: number,
    heading: number,
    nose: number,
    rider: Rider,
  ) {
    const forwardX = Math.cos(heading);
    const forwardY = Math.sin(heading);
    const lightX = x + forwardX * nose;
    const lightY = y + forwardY * nose;
    const index = this.activeHeadlights++;
    const light = (this.headlights[index] ??= this.image(
      effectFrame.car,
    ).setOrigin(0, 0.5));
    light
      .setPosition(Math.round(lightX), Math.round(lightY))
      .setRotation(heading)
      .setVisible(true);

    const dx = rider.x - lightX;
    const dy = rider.y - lightY;
    const ahead = dx * forwardX + dy * forwardY;
    if (ahead <= 0 || ahead >= 96) return false;
    const across = Math.abs(dx * forwardY - dy * forwardX);
    return (
      across <= 13 + ahead * 0.22 &&
      dx * Math.cos(rider.heading) + dy * Math.sin(rider.heading) >
        Math.hypot(dx, dy) * 0.7
    );
  }

  finishFrame(
    camera: Cameras.Scene2D.Camera,
    night: boolean,
    bikeLight: boolean,
    rider: Rider,
    reflected: boolean,
    at: number,
  ) {
    if (at < this.lastTime || !night) this.lastReflection = -Infinity;
    this.lastTime = at;
    if (reflected) this.lastReflection = at;
    for (
      let index = this.activeHeadlights;
      index < this.headlights.length;
      index++
    )
      this.headlights[index]!.setVisible(false);
    this.activeHeadlights = 0;

    const wasNight = this.ambient.visible;
    if (!night && !wasNight) return false;
    this.ambient.setVisible(night);
    this.bike.setVisible(night && bikeLight);
    if (!night) {
      for (const { glow } of this.lamps) glow.setVisible(false);
      for (const { glow } of this.neons) glow.setVisible(false);
      return false;
    }

    const x = camera.scrollX + camera.width / 2;
    const y = camera.scrollY + camera.height / 2;
    const halfWidth = camera.width / (2 * camera.zoom);
    const halfHeight = camera.height / (2 * camera.zoom);
    this.ambient
      .setPosition(x, y)
      .setDisplaySize(2 * halfWidth + 4, 2 * halfHeight + 4);
    if (bikeLight) {
      const side = rider.walking ? -4 : 0;
      const dx = Math.cos(rider.heading);
      const dy = Math.sin(rider.heading);
      this.bike
        .setPosition(
          Math.round(rider.x + dx * 9 - dy * side),
          Math.round(rider.y + dy * 9 + dx * side),
        )
        .setRotation(rider.heading);
    }
    for (const { lamp, glow } of this.lamps) {
      const visible =
        Math.abs(lamp.x - x) < halfWidth + 64 &&
        Math.abs(lamp.y - y) < halfHeight + 64;
      if (glow.visible !== visible) glow.setVisible(visible);
      if (visible && (glow.x !== lamp.x || glow.y !== lamp.y))
        glow.setPosition(lamp.x, lamp.y);
    }
    for (const [index, { glow, cycling }] of this.neons.entries()) {
      const visible =
        Math.abs(glow.x - x) < halfWidth + 64 &&
        Math.abs(glow.y - y) < halfHeight + 64;
      if (glow.visible !== visible) glow.setVisible(visible);
      if (visible && cycling) {
        const color =
          neonPalette[
            (Math.max(0, Math.floor(at)) + index) % neonPalette.length
          ]!;
        if (glow.tintTopLeft !== color) glow.setTint(color);
      }
    }

    return at - this.lastReflection <= 0.35;
  }
}
