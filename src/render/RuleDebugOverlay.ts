import type { GameObjects, Scene } from 'phaser';
import { FONT, ui } from '../core/presentation';
import type { RuleEngine } from '../rules/RuleEngine';
import type { EnvState } from '../rules/types';
import type { WorldModel } from '../rules/world/WorldModel';

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

export class RuleDebugOverlay {
  private readonly shapes: GameObjects.Graphics;
  private readonly labels: GameObjects.Text[] = [];
  private readonly panel = document.createElement('pre');
  private readonly input = new AbortController();

  constructor(
    scene: Scene,
    world: WorldModel,
    parent: HTMLElement,
    engine: () => RuleEngine,
    env: EnvState,
  ) {
    this.panel.className = 'rules-debug';
    this.panel.setAttribute('aria-label', label.title);
    this.panel.hidden = true;
    parent.append(this.panel);

    const shapes = (this.shapes = scene.add
      .graphics()
      .setDepth(18)
      .setVisible(false));
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
    for (const lane of world.lanes) {
      const color = priorities[lane.priorityClass];
      shapes.lineStyle(2, color, 0.9);
      for (let index = 1; index < lane.points.length; index++) {
        const start = lane.points[index - 1]!;
        const end = lane.points[index]!;
        shapes.lineBetween(
          start.x * scale,
          start.y * scale,
          end.x * scale,
          end.y * scale,
        );
      }
      const x = lane.end.x * scale;
      const y = lane.end.y * scale;
      const { x: dx, y: dy } = lane.forward;
      const arrow = 10;
      shapes.lineBetween(
        x,
        y,
        x - arrow * dx + arrow * dy,
        y - arrow * dy - arrow * dx,
      );
      shapes.lineBetween(
        x,
        y,
        x - arrow * dx - arrow * dy,
        y - arrow * dy + arrow * dx,
      );
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
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.code !== 'F3') return;
        event.preventDefault();
        if (event.repeat) return;
        this.panel.hidden = !this.panel.hidden;
        this.shapes.setVisible(!this.panel.hidden);
        this.update(engine(), world, env);
        for (const text of this.labels) text.setVisible(!this.panel.hidden);
      },
      { signal: this.input.signal },
    );
  }

  update(engine: RuleEngine, world: WorldModel, env: EnvState) {
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
    const lines = [
      label.title,
      `${label.zone}  ${crossing?.id ?? zone?.id ?? '—'}`,
      `${label.lane}  ${lane ? `${lane.id} · ${label.priorities[lane.priorityClass]}` : '—'}`,
      `${label.intersection}  ${junction?.id ?? '—'}`,
      `${label.signal}  ${controlled?.id ?? '—'}`,
      `  ${phases || (phase === 'off' ? '—' : label.phases[phase])}`,
      `TTC  ${conflict ? `${Number.isFinite(conflict.ttc) ? conflict.ttc.toFixed(2) : '—'} s · ${conflict.agentId}` : '—'}`,
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
    this.input.abort();
    this.panel.remove();
  }
}
