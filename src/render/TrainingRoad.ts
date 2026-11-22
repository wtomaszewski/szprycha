import type { GameObjects, Scene } from 'phaser';
import { cacheMapGraphics } from './MapGround';
import { FONT, ui } from '../core/presentation';
import type { EnvState, SignalPhase, Vec2 } from '../rules/types';
import type { Box, WorldModel } from '../rules/world/WorldModel';
import { vehicleFrame } from './spriteFrames';

const lightColor: Record<SignalPhase, number> = {
  red: 0xe43b44,
  arrow: 0xe43b44,
  green: 0xa7f070,
  yellow: 0xfeae34,
  off: 0x566c86,
};

export class TrainingRoad {
  readonly staticChunks: GameObjects.Image[] = [];
  private readonly lights: GameObjects.Graphics;
  private lastLightFrame = -1;

  constructor(
    scene: Scene,
    private readonly world: WorldModel,
    staticMap?: { key: string; width: number; height: number },
  ) {
    this.lights = scene.add.graphics().setDepth(7);
    const marks = scene.add.graphics().setDepth(3);
    const markCenters: Vec2[] = [];
    const scale = 1 / world.metersPerPixel;
    for (const route of world.trafficRoutes) {
      if (route.kind !== 'tram') continue;
      for (const stop of route.stops) {
        const x = (stop.x + stop.width / 2) * scale;
        const y = (stop.y + stop.height) * scale + 10;
        markCenters.push({ x, y });
        marks.fillStyle(0xf4f4f4).fillRect(x - 10, y - 10, 20, 20);
        marks.fillStyle(0x3b5dc9).fillRect(x - 9, y - 9, 18, 18);
        marks
          .fillStyle(0xf4f4f4)
          .fillRoundedRect(x - 5, y - 6, 10, 10, 2)
          .fillRect(x - 5, y + 6, 10, 1);
        marks.fillStyle(0x29366f).fillRect(x - 3, y - 4, 6, 3);
      }
    }
    for (const [index, car] of world.parkedCars.entries())
      this.drawParkedCar(scene, car, scale, index);
    const signs = scene.add.graphics().setDepth(6);
    const signCenters: Vec2[] = [];
    for (const sign of world.signs) {
      const x = sign.x * scale;
      const y = sign.y * scale;
      signCenters.push({ x, y });
      signs.fillStyle(0x1a1c2c).fillRect(x - 2, y, 4, 19);
      if (sign.displayOnly) {
        const graffiti = scene.add.graphics().setDepth(7);
        graffiti
          .lineStyle(2, 0x29366f)
          .beginPath()
          .moveTo(x + 3, y - 7)
          .lineTo(x - 4, y)
          .lineTo(x + 2, y)
          .lineTo(x - 2, y + 6)
          .strokePath();
      }
      if (sign.code === 'A-7') {
        signs
          .fillStyle(0xe43b44)
          .fillTriangle(x - 17, y - 11, x + 17, y - 11, x, y + 14);
        signs
          .fillStyle(0xfeae34)
          .fillTriangle(x - 11, y - 7, x + 11, y - 7, x, y + 10);
      } else if (sign.code === 'B-20') {
        for (const [radius, color] of [
          [17, 0xf4f4f4],
          [15, 0xe43b44],
        ] as const) {
          const points = Array.from({ length: 8 }, (_, i) => {
            const angle = Math.PI / 8 + (i * Math.PI) / 4;
            return {
              x: x + radius * Math.cos(angle),
              y: y + radius * Math.sin(angle),
            };
          });
          signs.fillStyle(color).fillPoints(points, true);
        }
        scene.add
          .text(x, y, 'STOP', { fontFamily: FONT, fontSize: '12px' })
          .setOrigin(0.5)
          .setDepth(7);
      } else if (sign.code === 'B-2') {
        signs
          .fillStyle(0xe43b44)
          .fillCircle(x, y, 14)
          .fillStyle(0xf4f4f4)
          .fillRect(x - 9, y - 2, 18, 4);
      } else if (sign.code === 'C-13' || sign.code === 'B-9') {
        const cyclePath = sign.code === 'C-13';
        signs
          .fillStyle(cyclePath ? 0xf4f4f4 : 0xe43b44)
          .fillCircle(x, y, 14)
          .fillStyle(cyclePath ? 0x3b5dc9 : 0xf4f4f4)
          .fillCircle(x, y, 11)
          .lineStyle(1.5, cyclePath ? 0xf4f4f4 : 0x1a1c2c)
          .strokeCircle(x - 5, y + 3, 3)
          .strokeCircle(x + 5, y + 3, 3)
          .lineBetween(x - 5, y + 3, x, y - 3)
          .lineBetween(x, y - 3, x + 5, y + 3)
          .lineBetween(x - 5, y + 3, x + 5, y + 3)
          .lineBetween(x + 2, y - 4, x + 5, y + 3);
      } else if (sign.code === 'D-40' || sign.code === 'D-41') {
        signs
          .fillStyle(0xf4f4f4)
          .fillRect(x - 20, y - 12, 40, 24)
          .fillStyle(0x3b5dc9)
          .fillRect(x - 18, y - 10, 36, 20)
          .fillStyle(0xf4f4f4)
          .fillRect(x - 15, y, 13, 4)
          .fillRect(x - 12, y - 3, 7, 4)
          .fillCircle(x, y - 4, 2)
          .fillTriangle(x + 6, y - 2, x + 11, y - 8, x + 16, y - 2)
          .fillRect(x + 7, y - 2, 8, 7)
          .lineStyle(1.5, 0xf4f4f4)
          .lineBetween(x, y - 1, x, y + 2)
          .lineBetween(x, y + 2, x - 2, y + 6)
          .lineBetween(x, y + 2, x + 2, y + 6);
        if (sign.code === 'D-41')
          signs
            .lineStyle(3, 0xe43b44)
            .lineBetween(x - 18, y + 9, x + 18, y - 9);
      } else if (sign.code === 'B-1') {
        signs
          .fillStyle(0xe43b44)
          .fillCircle(x, y, 14)
          .fillStyle(0xf4f4f4)
          .fillCircle(x, y, 10);
      } else if (sign.code === 'C-12') {
        signs
          .fillStyle(0xf4f4f4)
          .fillCircle(x, y, 14)
          .fillStyle(0x3b5dc9)
          .fillCircle(x, y, 12)
          .lineStyle(2, 0xf4f4f4)
          .strokeCircle(x, y, 6);
        for (let i = 0; i < 3; i++) {
          const theta = (i * 2 * Math.PI) / 3;
          const at = (dx: number, dy: number) =>
            [
              x + dx * Math.cos(theta) - dy * Math.sin(theta),
              y + dx * Math.sin(theta) + dy * Math.cos(theta),
            ] as const;
          signs
            .fillStyle(0xf4f4f4)
            .fillTriangle(...at(7, -4), ...at(4, 1), ...at(9, 1));
        }
      } else if (sign.code === 'D-46' || sign.code === 'D-47') {
        signs.fillStyle(0xf4f4f4).fillRect(x - 26, y - 8, 52, 16);
        signs.lineStyle(1, 0x333c57).strokeRect(x - 25, y - 7, 50, 14);
        const label = scene.add
          .text(x, y, ui.driving.internalRoadSign, {
            fontFamily: FONT,
            fontSize: '7px',
            color: '#1a1c2c',
          })
          .setOrigin(0.5)
          .setDepth(6);
        label.setScale(Math.min(1, 46 / label.width), 1);
        if (sign.code === 'D-47')
          scene.add
            .graphics()
            .setDepth(7)
            .lineStyle(2, 0xe43b44)
            .lineBetween(x - 24, y + 7, x + 24, y - 7);
      } else if (sign.code === 'A-11a' || sign.code === 'A-17') {
        signs
          .fillStyle(0xe43b44)
          .fillTriangle(x, y - 14, x - 17, y + 12, x + 17, y + 12);
        signs
          .fillStyle(0xfeae34)
          .fillTriangle(x, y - 9, x - 12, y + 9, x + 12, y + 9);
        if (sign.code === 'A-11a')
          signs.fillStyle(0x1a1c2c).fillEllipse(x, y + 5, 15, 5);
        else {
          signs
            .fillStyle(0x1a1c2c)
            .fillCircle(x - 3, y - 2, 2)
            .fillCircle(x + 4, y + 1, 2);
          signs
            .lineStyle(2, 0x1a1c2c)
            .lineBetween(x - 3, y, x - 3, y + 7)
            .lineBetween(x + 4, y + 3, x + 4, y + 8);
        }
      } else if (sign.code === 'D-1') {
        signs.fillStyle(0xf4f4f4).fillPoints(
          [
            { x, y: y - 13 },
            { x: x + 13, y },
            { x, y: y + 13 },
            { x: x - 13, y },
          ],
          true,
        );
        signs.fillStyle(0xffcd75).fillPoints(
          [
            { x, y: y - 9 },
            { x: x + 9, y },
            { x, y: y + 9 },
            { x: x - 9, y },
          ],
          true,
        );
      }
    }
    if (staticMap) {
      const { key, width, height } = staticMap;
      this.staticChunks.push(
        ...cacheMapGraphics(
          scene,
          marks,
          `${key}-marks`,
          width,
          height,
          markCenters,
          10,
        ),
        ...cacheMapGraphics(
          scene,
          signs,
          `${key}-signs`,
          width,
          height,
          signCenters,
          28,
        ),
      );
    }
  }

  updateLights(at: number, environment: EnvState) {
    const frame = Math.floor(at * 10);
    if (this.lastLightFrame === frame) return;
    this.lastLightFrame = frame;
    const scale = 1 / this.world.metersPerPixel;
    this.lights.clear();
    for (const crossing of this.world.crossings) {
      const rail = this.world.railState(crossing, at, environment);
      if (rail)
        this.drawRailSignals(
          crossing,
          rail.flashing,
          rail.barrier === 'closed',
          scale,
          at,
        );
      const { signal } = crossing;
      if (!signal) continue;
      const open = this.world.crossingAllowsEntry(crossing, at, environment);
      const color = lightColor[open ? 'green' : 'red'];
      this.drawCrossingSignal(
        signal.x * scale,
        signal.y * scale,
        color,
        crossing.kind === 'pedestrian',
      );
      if (crossing.kind === 'pedestrian') {
        const x =
          crossing.axis === 'x'
            ? 2 * crossing.x + crossing.width - signal.x
            : signal.x;
        const y =
          crossing.axis === 'y'
            ? 2 * crossing.y + crossing.height - signal.y
            : signal.y;
        this.drawCrossingSignal(x * scale, y * scale, color, true);
      }
    }
    for (const signal of this.world.signals) {
      const lane = this.world.getLane(signal.affects)!;
      const phase = this.world.phase(lane, at, environment);
      const x = signal.x * scale;
      const y = signal.y * scale;
      this.lights.fillStyle(0x1a1c2c).fillRect(x - 8, y - 12, 16, 24);
      if (lane.type === 'tram') {
        this.lights.lineStyle(3, 0xf4f4f4);
        if (phase === 'green') this.lights.lineBetween(x, y - 5, x, y + 5);
        else if (phase !== 'off') this.lights.lineBetween(x - 5, y, x + 5, y);
      } else if (signal.code === 'S-1') {
        this.lights.fillStyle(lightColor[phase]).fillCircle(x, y, 5);
      } else if (phase === 'arrow') {
        const d = signal.direction === 'right' ? 1 : -1;
        this.lights
          .lineStyle(2, 0xa7f070)
          .lineBetween(x - 5 * d, y, x + 5 * d, y)
          .lineBetween(x + 5 * d, y, x, y - 5)
          .lineBetween(x + 5 * d, y, x, y + 5);
      }
    }
  }

  private drawParkedCar(scene: Scene, car: Box, scale: number, index: number) {
    const width = car.width * scale;
    const height = car.height * scale;
    const horizontal = width > height;
    scene.add
      .image(
        (car.x + car.width / 2) * scale,
        (car.y + car.height / 2) * scale,
        'traffic-car',
        vehicleFrame(3 + (index % 3), false, undefined, false),
      )
      .setDepth(3)
      .setDisplaySize(
        ((horizontal ? height : width) * 32) / 25,
        ((horizontal ? width : height) * 48) / 38,
      )
      .setRotation(horizontal ? Math.PI / 2 : 0);
  }

  private drawRailSignals(
    box: Box,
    flashing: boolean,
    closed: boolean,
    scale: number,
    at: number,
  ) {
    const x = box.x * scale;
    const y = box.y * scale;
    const width = box.width * scale;
    const height = box.height * scale;
    for (const south of [false, true]) {
      const postX = south ? x + width : x;
      const postY = south ? y + height + 8 : y - 8;
      const direction = south ? -1 : 1;
      if (closed) {
        this.lights
          .lineStyle(5, 0xf4f4f4)
          .lineBetween(postX, postY, postX + direction * width * 0.48, postY);
        this.lights.lineStyle(5, 0xe43b44);
        for (let i = 10; i < width * 0.44; i += 20)
          this.lights.lineBetween(
            postX + direction * i,
            postY,
            postX + direction * (i + 10),
            postY,
          );
      }
      this.lights
        .fillStyle(0x1a1c2c)
        .fillRoundedRect(postX - 12, postY - 7, 24, 14, 3);
      const phase = Math.floor(at * 2) % 2;
      this.lights
        .fillStyle(lightColor[flashing && phase === 0 ? 'red' : 'off'])
        .fillCircle(postX - 5, postY, 3);
      this.lights
        .fillStyle(lightColor[flashing && phase === 1 ? 'red' : 'off'])
        .fillCircle(postX + 5, postY, 3);
    }
  }

  private drawCrossingSignal(
    x: number,
    y: number,
    color: number,
    pedestrian: boolean,
  ) {
    this.lights.fillStyle(0x1a1c2c).fillRoundedRect(x - 8, y - 9, 16, 18, 2);
    if (pedestrian) {
      this.lights.fillStyle(color).fillCircle(x, y - 4, 2);
      this.lights
        .lineStyle(2, color)
        .lineBetween(x, y - 2, x, y + 2)
        .lineBetween(x, y, x - 3, y + 1)
        .lineBetween(x, y, x + 3, y + 1)
        .lineBetween(x, y + 2, x - 2, y + 5)
        .lineBetween(x, y + 2, x + 2, y + 5);
    } else {
      this.lights
        .lineStyle(1, color)
        .strokeCircle(x - 3, y + 1, 2)
        .strokeCircle(x + 3, y + 1, 2)
        .lineBetween(x - 3, y + 1, x, y - 3)
        .lineBetween(x, y - 3, x + 3, y + 1);
    }
  }
}
