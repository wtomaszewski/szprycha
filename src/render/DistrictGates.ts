import type { GameObjects, Scene } from 'phaser';
import type { Obstacle } from '../gameplay/bicycle';
import type { WorldModel } from '../rules/world/WorldModel';

export class DistrictGates {
  private readonly art: GameObjects.Graphics;
  private readonly gates;

  constructor(
    scene: Scene,
    world: WorldModel,
    private readonly obstacles: Obstacle[],
  ) {
    this.art = scene.add.graphics().setDepth(7);
    const px = 1 / world.metersPerPixel;
    this.gates = world.districts.flatMap(({ x, y, width, height, unlock }) => {
      if (!unlock) return [];
      const obstacle: Obstacle = {
        x: x * px,
        y: y * px,
        width: width * px,
        height: height * px,
        kind: 'wall',
      };
      return [
        {
          obstacle,
          mission: unlock.missionId,
          x: unlock.x * px,
          y: unlock.y * px,
          vertical: unlock.vertical,
          locked: false,
        },
      ];
    });
  }

  update(completed: readonly string[]) {
    let opened = false;
    this.art.clear();
    for (const gate of this.gates) {
      const { obstacle: box, x, y, vertical } = gate;
      const locked = !completed.includes(gate.mission);
      if (locked !== gate.locked) {
        if (locked) this.obstacles.push(box);
        else {
          this.obstacles.splice(this.obstacles.indexOf(box), 1);
          opened = true;
        }
        gate.locked = locked;
      }
      if (!locked) continue;
      this.art
        .lineStyle(6, 0x333c57)
        .strokeRect(box.x, box.y, box.width, box.height);
      this.art
        .lineStyle(2, 0xa39378)
        .strokeRect(box.x, box.y - 2, box.width, box.height);
      for (let i = -28; i < 32; i += 8)
        this.art
          .fillStyle((i + 28) % 16 === 0 ? 0xffcd75 : 0x1a1c2c)
          .fillRect(
            x + (vertical ? -6 : i),
            y + (vertical ? i : -6),
            vertical ? 12 : 8,
            vertical ? 8 : 12,
          );
    }
    return opened;
  }

  near(x: number, y: number) {
    const margin = 18;
    return this.gates.some(
      ({ locked, obstacle: box }) =>
        locked &&
        x >= box.x - margin &&
        x <= box.x + box.width + margin &&
        y >= box.y - margin &&
        y <= box.y + box.height + margin,
    );
  }
}
