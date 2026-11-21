import type { GameObjects, Scene } from 'phaser';
import { FONT } from '../core/presentation';
import type { EnvState, SignalPhase } from '../rules/types';
import type { WorldModel } from '../rules/world/WorldModel';

const lightColor: Record<SignalPhase, number> = {
  red: 0xe43b44,
  arrow: 0xe43b44,
  green: 0xa7f070,
  yellow: 0xfeae34,
  off: 0x566c86,
};

export class TrainingRoad {
  private readonly lights: GameObjects.Graphics;
  private lastLightFrame = -1;

  constructor(
    scene: Scene,
    private readonly world: WorldModel,
  ) {
    this.lights = scene.add.graphics().setDepth(7);
    const marks = scene.add.graphics().setDepth(3);
    const scale = 1 / world.metersPerPixel;
    for (const zone of world.zones) {
      if (zone.kind !== 'bike_path' && zone.kind !== 'bike_lane') continue;
      const x = zone.x * scale;
      const y = zone.y * scale;
      const w = zone.width * scale;
      const h = zone.height * scale;
      marks
        .fillStyle(0x3b5dc9, zone.kind === 'bike_path' ? 0.8 : 0.47)
        .fillRect(x, y, w, h);
      if (zone.kind === 'bike_lane') {
        marks.lineStyle(2, 0xf4f4f4, 0.85);
        for (let i = 0; i < w; i += 26)
          marks.lineBetween(x + i, y + h, x + Math.min(i + 13, w), y + h);
        for (let i = 54; i < w; i += 96) {
          marks
            .strokeCircle(x + i - 6, y + h / 2, 4)
            .strokeCircle(x + i + 6, y + h / 2, 4)
            .lineBetween(x + i - 6, y + h / 2, x + i, y + h / 2 - 5)
            .lineBetween(x + i, y + h / 2 - 5, x + i + 6, y + h / 2);
        }
      }
    }
    for (const route of world.trafficRoutes) {
      if (route.kind !== 'tram') continue;
      for (const { start, end, direction } of route.path.segments) {
        const x = start.x * scale;
        const y = start.y * scale;
        const ex = end.x * scale;
        const ey = end.y * scale;
        marks.lineStyle(14, 0x24283b).lineBetween(x, y, ex, ey);
        for (const offset of [-5, 5]) {
          const dx = -direction.y * offset;
          const dy = direction.x * offset;
          marks
            .lineStyle(2, 0x8895a8)
            .lineBetween(x + dx, y + dy, ex + dx, ey + dy);
        }
      }
      for (const stop of route.stops) {
        const x = (stop.x + stop.width / 2) * scale;
        const y = (stop.y + stop.height) * scale + 10;
        marks.fillStyle(0xf4f4f4).fillRect(x - 10, y - 10, 20, 20);
        marks.fillStyle(0x3b5dc9).fillRect(x - 9, y - 9, 18, 18);
        marks
          .fillStyle(0xf4f4f4)
          .fillRoundedRect(x - 5, y - 6, 10, 10, 2)
          .fillRect(x - 5, y + 6, 10, 1);
        marks.fillStyle(0x29366f).fillRect(x - 3, y - 4, 6, 3);
      }
    }
    for (const crossing of world.crossings) {
      const x = crossing.x * scale;
      const y = crossing.y * scale;
      const width = crossing.width * scale;
      const height = crossing.height * scale;
      if (crossing.kind === 'pedestrian') {
        marks.fillStyle(0xf4f4f4);
        const vertical = crossing.axis === 'y';
        const length = vertical ? height : width;
        for (let i = 0; i < length; i += 16) {
          if (vertical)
            marks.fillRect(x, y + i, width, Math.min(9, length - i));
          else marks.fillRect(x + i, y, Math.min(9, length - i), height);
        }
      } else if (crossing.kind === 'bike') {
        marks.fillStyle(0x3b5dc9, 0.65).fillRect(x, y, width, height);
        const vertical = crossing.axis === 'y';
        const length = vertical ? height : width;
        for (let i = 0; i < length; i += 16) {
          marks.fillStyle(0xf4f4f4);
          if (vertical)
            marks.fillRect(x, y + i, 6, 7).fillRect(x + width - 6, y + i, 6, 7);
          else
            marks
              .fillRect(x + i, y, 7, 4)
              .fillRect(x + i, y + height - 4, 7, 4);
        }
      }
    }
    for (const lane of world.lanes) {
      if (!lane.stopSign && !lane.mainSignal) continue;
      const x = lane.end.x * scale;
      const y = lane.end.y * scale;
      const halfWidth = lane.type === 'tram' ? 13 : 45;
      const halfX = -lane.forward.y * halfWidth;
      const halfY = lane.forward.x * halfWidth;
      marks.lineStyle(lane.stopSign?.code === 'A-7' ? 2 : 4, 0xf4f4f4);
      if (lane.stopSign?.code === 'A-7') {
        for (let i = -1; i < 1; i += 0.25) {
          marks.lineBetween(
            x + i * halfX,
            y + i * halfY,
            x + (i + 0.12) * halfX,
            y + (i + 0.12) * halfY,
          );
        }
      } else marks.lineBetween(x - halfX, y - halfY, x + halfX, y + halfY);
    }
    const signs = scene.add.graphics().setDepth(6);
    for (const sign of world.signs) {
      const x = sign.x * scale;
      const y = sign.y * scale;
      signs.fillStyle(0x1a1c2c).fillRect(x - 2, y, 4, 19);
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
  }

  updateLights(at: number, environment: EnvState) {
    const frame = Math.floor(at * 10);
    if (this.lastLightFrame === frame) return;
    this.lastLightFrame = frame;
    const scale = 1 / this.world.metersPerPixel;
    this.lights.clear();
    for (const crossing of this.world.crossings) {
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
