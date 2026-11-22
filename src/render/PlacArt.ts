import type { GameObjects, Scene } from 'phaser';
import type { PlacCourse, PlacId } from '../content/plac';
import { FONT, ui } from '../core/presentation';
import type { PlacDetector, Point } from '../gameplay/plac/detectors/types';

const edge = 0xa7bfc9;
const asphalt = 0x333c57;
const accent = 0xffcd75;
const aqua = 0x73eff7;

function path(art: GameObjects.Graphics, points: readonly Point[]) {
  art.beginPath().moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++)
    art.lineTo(points[i]!.x, points[i]!.y);
  art.strokePath();
}

function arrow(
  art: GameObjects.Graphics,
  x: number,
  y: number,
  angle: number,
  color: number,
) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  art
    .fillStyle(color)
    .fillTriangle(
      x + dx * 9,
      y + dy * 9,
      x - dx * 6 - dy * 6,
      y - dy * 6 + dx * 6,
      x - dx * 6 + dy * 6,
      y - dy * 6 - dx * 6,
    );
}

function drawGround(scene: Scene, { width, height }: PlacCourse) {
  const key = `plac-ground-${width}x${height}`;
  if (!scene.textures.exists(key)) {
    const ground = scene.add.graphics();
    ground.fillStyle(0x25494c).fillRect(0, 0, width, height);
    ground.fillStyle(0x1c293d).fillRect(26, 66, width - 52, height - 105);
    ground.fillStyle(0x41536a).fillRect(30, 62, width - 60, height - 110);
    ground.fillStyle(0x293249).fillRect(38, 70, width - 76, height - 126);
    ground.lineStyle(1, 0x65778c).strokeRect(34, 66, width - 68, height - 118);
    for (let x = 10; x < width - 10; x += 12) {
      const variation = (x * 7) % 17;
      ground
        .fillStyle(0x356368)
        .fillRect(x, 48 - variation, 3, 2)
        .fillRect(x, height - 30 + variation, 4, 2);
      if (x > 38 && x < width - 38) {
        ground
          .fillStyle(x % 24 === 10 ? 0xd87848 : 0xffcd75)
          .fillRect(x, 63, 9, 3)
          .fillRect(x, height - 52, 9, 3);
      }
    }
    for (let y = 82; y < height - 66; y += 13)
      for (let x = 49; x < width - 48; x += 16)
        ground.fillStyle(0x354158).fillRect(x + (y % 5), y, 2, 1);
    ground.generateTexture(key, width, height);
    ground.destroy();
  }
  scene.add.image(0, 0, key).setOrigin(0);
}

export class PlacArt {
  private readonly markings: GameObjects.Graphics;
  private readonly active: GameObjects.Graphics;
  private readonly labels: GameObjects.Text[] = [];
  private previousMarker = -1;
  private coneHitAt: (number | undefined)[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly course: PlacCourse,
  ) {
    drawGround(scene, course);
    this.markings = scene.add.graphics();
    this.active = scene.add.graphics().setDepth(2);
  }

  private label(x: number, y: number, text: string, color: string) {
    this.labels.push(
      this.scene.add
        .text(x, y, text, {
          fontFamily: FONT,
          fontSize: '12px',
          color,
        })
        .setOrigin(0.5)
        .setDepth(3),
    );
  }

  show(id: PlacId) {
    const art = this.markings.clear();
    const exercise = this.course.exercises[id];
    const { x, y, heading } = exercise.start;
    this.active.clear();
    this.coneHitAt = [];
    this.previousMarker = -1;
    for (const label of this.labels) label.destroy();
    this.labels.length = 0;
    if ('path' in exercise) {
      for (const [width, color] of [
        [2 * exercise.halfWidth, edge],
        [2 * exercise.halfWidth - 3, asphalt],
      ] as const) {
        art.lineStyle(width, color);
        path(art, exercise.path);
        art.fillStyle(color);
        for (const waypoint of exercise.path)
          art.fillCircle(waypoint.x, waypoint.y, width / 2);
      }
      for (let i = 1; i < exercise.path.length; i++) {
        const node = exercise.path[i]!;
        art.fillStyle(0x566c86).fillCircle(node.x, node.y, 2);
      }
    } else {
      const { start } = exercise;
      const finish =
        'finishX' in exercise
          ? exercise.finishX
          : exercise.stopBox.x + exercise.stopBox.width;
      const half = 'halfWidth' in exercise ? exercise.halfWidth : 49;
      art
        .fillStyle(asphalt)
        .fillRect(x - 15, y - half, finish - x + 27, half * 2);
      art
        .lineStyle(2, edge)
        .lineBetween(x - 15, y - half, finish + 12, y - half)
        .lineBetween(x - 15, y + half, finish + 12, y + half);
      for (let dash = x + 23; dash < finish - 12; dash += 21)
        art.fillStyle(0x566c86).fillRect(dash, y - 1, 8, 2);
      art.fillStyle(aqua).fillRect(start.x - 12, y - half, 2, half * 2);
      if ('stopBox' in exercise) {
        const { x, y, width, height } = exercise.stopBox;
        art
          .fillStyle(0x257179, 0.55)
          .fillRect(x, y, width, height)
          .lineStyle(2, aqua)
          .strokeRect(x, y, width, height);
      } else {
        if ('signalFromX' in exercise)
          art
            .fillStyle(accent, 0.21)
            .fillRect(
              exercise.signalFromX,
              y - half,
              finish - exercise.signalFromX,
              half * 2,
            )
            .fillStyle(accent)
            .fillRect(exercise.signalFromX, y - half, 2, half * 2);
        for (let flag = -half; flag < half; flag += 4)
          art
            .fillStyle(Math.floor((flag + half) / 4) % 2 ? edge : 0x1a1c2c)
            .fillRect(finish - 2, y + flag, 4, Math.min(4, half - flag));
        this.label(finish, y + half + 15, ui.plac.finish, '#f4f4f4');
      }
    }
    arrow(
      art,
      x + Math.cos(heading) * 19,
      y + Math.sin(heading) * 19,
      heading,
      aqua,
    );
    this.label(x - 4, y + 25, ui.plac.startHere, '#73eff7');
    this.update(id, undefined, 0);
  }

  update(id: PlacId, detector: PlacDetector | undefined, seconds: number) {
    const marker = detector?.nextMarker ?? 0;
    const animating = this.coneHitAt.some(
      (at) => at !== undefined && seconds - at < 0.55,
    );
    if (
      marker === this.previousMarker &&
      !animating &&
      (detector?.coneHits.size ?? 0) ===
        this.coneHitAt.filter((at) => at !== undefined).length
    )
      return;
    this.previousMarker = marker;
    const art = this.active.clear();
    const exercise = this.course.exercises[id];
    if ('path' in exercise) {
      const next = exercise.path[marker || 1];
      const after = exercise.path[(marker || 1) + 1];
      if (next) {
        art.lineStyle(2, accent, 0.9).strokeCircle(next.x, next.y, 12);
        if (after)
          arrow(
            art,
            next.x,
            next.y,
            Math.atan2(after.y - next.y, after.x - next.x),
            accent,
          );
      }
    }
    const cones =
      'cones' in exercise
        ? exercise.cones
        : 'gates' in exercise
          ? exercise.gates
          : [];
    for (let i = 0; i < cones.length; i++) {
      const { x, y, radius } = cones[i]!;
      if (detector?.coneHits.has(i)) this.coneHitAt[i] ??= seconds;
      const hitAt = this.coneHitAt[i];
      const elapsed = hitAt === undefined ? Infinity : seconds - hitAt;
      const tilt =
        elapsed < 0.5 ? Math.sin(elapsed * 48) * (1 - elapsed * 2) * 8 : 0;
      art.fillStyle(0x151b2a).fillRect(x - radius, y + 3, 2 * radius, 4);
      art
        .fillStyle(hitAt === undefined ? 0xef7d57 : 0xab5662)
        .fillTriangle(
          x - radius,
          y + 4,
          x + radius,
          y + 4,
          x + tilt,
          y - radius - 2,
        );
      art
        .fillStyle(0xffe2ac)
        .fillRect(x - radius / 2 + tilt / 2, y - 1, radius, 2);
    }
    if ('gates' in exercise) {
      const next = exercise.gates[marker];
      if (next)
        arrow(
          art,
          next.x,
          next.y + (next.side === 'above' ? -27 : 27),
          0,
          accent,
        );
    }
  }
}
