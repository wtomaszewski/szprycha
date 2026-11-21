import type { GameObjects, Scene } from 'phaser';
import { FONT, ui } from '../core/presentation';
import type { RuleEngine } from '../rules/RuleEngine';
import type { EnvState, Vec2 } from '../rules/types';
import type { WorldModel } from '../rules/world/WorldModel';
import type { TrafficCar } from '../sim/TrafficSimulation';

const palette = {
  roadway: 0x41a6f6,
  sidewalk: 0xffcd75,
  bike_path: 0xa7f070,
  bike_lane: 0xa7f070,
};
const priorities = {
  equal: 0x73eff7,
  main: 0xa7f070,
  minor: 0xffcd75,
  signal: 0xff77a8,
  roundabout_in: 0xc0cbdc,
  roundabout_ring: 0xc0cbdc,
};
const label = ui.rules.debug;

function arrow(
  shapes: GameObjects.Graphics,
  x: number,
  y: number,
  dx: number,
  dy: number,
  size: number,
) {
  shapes.lineBetween(
    x,
    y,
    x - size * dx + (size * dy) / 2,
    y - size * dy - (size * dx) / 2,
  );
  shapes.lineBetween(
    x,
    y,
    x - size * dx - (size * dy) / 2,
    y - size * dy + (size * dx) / 2,
  );
}

export class RuleDebugOverlay {
  private readonly shapes: GameObjects.Graphics;
  private readonly traffic: GameObjects.Graphics;
  private readonly labels: GameObjects.Text[] = [];
  private readonly panel = document.createElement('pre');

  constructor(scene: Scene, world: WorldModel, parent: HTMLElement) {
    this.panel.className = 'rules-debug';
    this.panel.setAttribute('aria-label', label.title);
    this.panel.hidden = true;
    parent.append(this.panel);

    const shapes = (this.shapes = scene.add
      .graphics()
      .setDepth(18)
      .setVisible(false));
    this.traffic = scene.add.graphics().setDepth(19).setVisible(false);
    const scale = 1 / world.metersPerPixel;
    for (const zone of world.zones) {
      const color = palette[zone.kind as keyof typeof palette] ?? 0xc0cbdc;
      shapes
        .fillStyle(color, 0.14)
        .fillRect(
          zone.x * scale,
          zone.y * scale,
          zone.width * scale,
          zone.height * scale,
        );
      shapes
        .lineStyle(1, color, 0.75)
        .strokeRect(
          zone.x * scale,
          zone.y * scale,
          zone.width * scale,
          zone.height * scale,
        );
    }
    for (const crossing of world.crossings) {
      const color = crossing.kind === 'pedestrian' ? 0xf4f4f4 : 0xa7f070;
      shapes
        .lineStyle(2, color)
        .strokeRect(
          crossing.x * scale,
          crossing.y * scale,
          crossing.width * scale,
          crossing.height * scale,
        );
    }
    for (const intersection of world.intersections) {
      shapes
        .lineStyle(2, 0xff77a8)
        .strokeRect(
          intersection.x * scale,
          intersection.y * scale,
          intersection.width * scale,
          intersection.height * scale,
        );
    }
    for (const { path } of world.laneGraph.movements) {
      shapes.lineStyle(1, 0xc0cbdc, 0.65);
      shapes.lineBetween(
        path.start.x * scale,
        path.start.y * scale,
        path.end.x * scale,
        path.end.y * scale,
      );
    }
    for (const { pos, kind } of world.laneGraph.nodes) {
      shapes
        .fillStyle(kind === 'inlet' ? 0xff77a8 : 0x73eff7, 0.95)
        .fillCircle(pos.x * scale, pos.y * scale, 4);
    }
    for (const edge of world.laneGraph.edges) {
      const { lane, path } = edge;
      const color = lane ? priorities[lane.priorityClass] : 0x73eff7;
      shapes.lineStyle(2, color, 0.9);
      for (const { start, end } of path.segments) {
        shapes.lineBetween(
          start.x * scale,
          start.y * scale,
          end.x * scale,
          end.y * scale,
        );
      }
      const x = path.end.x * scale;
      const y = path.end.y * scale;
      const { x: dx, y: dy } = path.segments.at(-1)!.direction;
      arrow(shapes, x, y, dx, dy, 11);
      if (!lane) continue;
      this.labels.push(
        scene.add
          .text(
            x - dx * 26,
            y - dy * 26,
            label.priorities[lane.priorityClass],
            {
              fontFamily: FONT,
              fontSize: '14px',
              color: '#f4f4f4',
              backgroundColor: '#1a1c2c',
              padding: { x: 4, y: 2 },
            },
          )
          .setOrigin(0.5)
          .setDepth(19)
          .setVisible(false),
      );
    }
  }

  setVisible(visible: boolean) {
    this.panel.hidden = !visible;
    this.shapes.setVisible(visible);
    this.traffic.setVisible(visible);
    for (const text of this.labels) text.setVisible(visible);
  }

  update(
    engine: RuleEngine,
    world: WorldModel,
    env: EnvState,
    cars: readonly TrafficCar[],
    player: Vec2,
  ) {
    if (this.panel.hidden) return;
    const { zone, crossing, intersection } = engine.zones;
    const {
      debugLane: lane,
      debugConflict: conflict,
      debugPhase: phase,
    } = engine.junction;
    const junction = intersection ?? lane?.intersection;
    const controlled =
      junction?.kind === 'signals'
        ? junction
        : world.intersections.find((other) => other.kind === 'signals');
    const phases = controlled?.lanes
      .filter((lane) => lane.mainSignal)
      .map(
        (other) =>
          `${other.side} ${label.phases[world.phase(other, engine.at, env)]}`,
      )
      .join(' · ');
    this.traffic.clear();
    const scale = 1 / world.metersPerPixel;
    for (const car of cars) {
      const color =
        car.intent === 'protective'
          ? 0xff77a8
          : car.speed < 0.1
            ? 0xffcd75
            : 0xa7f070;
      const angle =
        car.heading +
        (car.maneuver === 'left' ? -0.65 : car.maneuver === 'right' ? 0.65 : 0);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const x = car.pos.x * scale;
      const y = car.pos.y * scale;
      this.traffic
        .lineStyle(3, color)
        .lineBetween(x, y, x + dx * 42, y + dy * 42);
      arrow(this.traffic, x + dx * 42, y + dy * 42, dx, dy, 10);
    }
    const closest = [...cars]
      .sort(
        (a, b) =>
          Math.hypot(a.pos.x - player.x, a.pos.y - player.y) -
          Math.hypot(b.pos.x - player.x, b.pos.y - player.y),
      )
      .slice(0, 3);
    const lines = [
      label.title,
      `${label.zone}  ${crossing?.id ?? zone?.id ?? '—'}`,
      `${label.lane}  ${lane ? `${lane.id} · ${label.priorities[lane.priorityClass]}` : '—'}`,
      `${label.intersection}  ${junction?.id ?? '—'}`,
      `${label.signal}  ${controlled?.id ?? '—'}`,
      `  ${phases || (phase === 'off' ? '—' : label.phases[phase])}`,
      `TTC  ${conflict ? `${Number.isFinite(conflict.ttc) ? conflict.ttc.toFixed(2) : '—'} s · ${conflict.agentId}` : '—'}`,
      '',
      label.traffic,
      ...closest.map(
        ({ id, intent, maneuver, destination }) =>
          `  ${id} · ${maneuver ? label.maneuvers[maneuver] : label.exit} · ${label.intents[intent]}${destination ? ` → ${destination}` : ''}`,
      ),
      '',
      label.history,
      ...engine.recent
        .slice()
        .reverse()
        .map(
          (verdict) =>
            `  ${verdict.at.toFixed(2)} s  ${verdict.ruleId}  ${verdict.kind}`,
        ),
      '',
      label.mastery,
    ];
    this.panel.textContent = lines.join('\n');
  }

  destroy() {
    this.panel.remove();
  }
}
