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
      if (zone.kind === 'bike_path')
        marks
          .fillStyle(0x3b5dc9, 0.8)
          .fillRect(
            zone.x * scale,
            zone.y * scale,
            zone.width * scale,
            zone.height * scale,
          );
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
        for (let i = 0; i < height; i += 16) {
          marks
            .fillStyle(0xf4f4f4)
            .fillRect(x, y + i, 6, 7)
            .fillRect(x + width - 6, y + i, 6, 7);
        }
      }
    }
    for (const lane of world.lanes) {
      if (!lane.stopSign && !lane.mainSignal) continue;
      const x = lane.end.x * scale;
      const y = lane.end.y * scale;
      const halfX = -lane.forward.y * 45;
      const halfY = lane.forward.x * 45;
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
    for (const signal of this.world.signals) {
      const lane = this.world.getLane(signal.affects)!;
      const phase = this.world.phase(lane, at, environment);
      const x = signal.x * scale;
      const y = signal.y * scale;
      this.lights.fillStyle(0x1a1c2c).fillRect(x - 8, y - 12, 16, 24);
      if (signal.code === 'S-1')
        this.lights.fillStyle(lightColor[phase]).fillCircle(x, y, 5);
      else if (phase === 'arrow') {
        const d = signal.direction === 'right' ? 1 : -1;
        this.lights
          .lineStyle(2, 0xa7f070)
          .lineBetween(x - 5 * d, y, x + 5 * d, y)
          .lineBetween(x + 5 * d, y, x, y - 5)
          .lineBetween(x + 5 * d, y, x, y + 5);
      }
    }
  }
}
