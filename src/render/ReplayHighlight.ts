import type { GameObjects, Scene } from 'phaser';
import type { ReplayFrame } from '../gameplay/ReplayBuffer';
import { hazardBallId, hazardCyclistId } from '../gameplay/TrafficEvents';
import type { AgentState, Verdict } from '../rules/types';
import type { WorldModel, Box } from '../rules/world/WorldModel';

export const HIGHLIGHT_HZ = 2;

export class ReplayHighlight {
  private readonly art: GameObjects.Graphics;

  constructor(
    scene: Scene,
    private readonly world: WorldModel,
    private readonly agents: readonly AgentState[],
  ) {
    this.art = scene.add.graphics().setDepth(25);
  }

  focus(verdict: Verdict) {
    const { signId, zoneId } = verdict.highlight ?? {};
    const sign =
      signId &&
      (this.world.signs.find(({ id }) => id === signId) ??
        this.world.signals.find(({ id }) => id === signId));
    const area = zoneId ? this.findArea(zoneId) : undefined;
    // Small areas can be framed with the rider. Long road zones are outlined in place.
    const target =
      sign ||
      (area && Math.max(area.width, area.height) <= 14
        ? { x: area.x + area.width / 2, y: area.y + area.height / 2 }
        : verdict.pos);
    const scale = 1 / this.world.metersPerPixel;
    return {
      x: ((target.x + verdict.pos.x) * scale) / 2,
      y: ((target.y + verdict.pos.y) * scale) / 2,
    };
  }

  draw(
    verdict: Verdict,
    frame: ReplayFrame,
    elapsed: number,
    reduced: boolean,
  ) {
    const { signId, zoneId, agentId } = verdict.highlight ?? {};
    const scale = 1 / this.world.metersPerPixel;
    const phase = reduced
      ? 0
      : (1 - Math.cos((elapsed * 2 * Math.PI * HIGHLIGHT_HZ) / 1000)) / 2;
    const art = this.art.clear().lineStyle(3, 0xffcd75, 0.75 + 0.25 * phase);
    const sign =
      signId &&
      (this.world.signs.find(({ id }) => id === signId) ??
        this.world.signals.find(({ id }) => id === signId));
    const area = zoneId ? this.findArea(zoneId) : undefined;
    const actor =
      agentId === hazardCyclistId
        ? frame.props[2]
        : agentId === hazardBallId
          ? frame.props[0]
          : agentId
            ? frame.actors[this.agents.findIndex(({ id }) => id === agentId)]
            : undefined;
    if (area)
      art.strokeRect(
        area.x * scale - 3,
        area.y * scale - 3,
        area.width * scale + 6,
        area.height * scale + 6,
      );
    if (sign) art.strokeCircle(sign.x * scale, sign.y * scale, 19 + 5 * phase);
    if (actor?.active) {
      const x = actor.x * scale;
      const y = actor.y * scale;
      art
        .strokeCircle(x, y, 29 + 5 * phase)
        .lineBetween(x, y - 49, x, y - 33)
        .lineBetween(x - 7, y - 40, x, y - 33)
        .lineBetween(x + 7, y - 40, x, y - 33);
    }
    if (!sign && !area && !actor?.active)
      art.strokeCircle(
        verdict.pos.x * scale,
        verdict.pos.y * scale,
        22 + 5 * phase,
      );
  }

  clear() {
    this.art.clear();
  }

  private findArea(zoneId: string): Box | undefined {
    return (
      this.world.crossings.find(({ id }) => id === zoneId) ??
      this.world.tramStops.find(({ id }) => id === zoneId) ??
      this.world.intersections.find(({ id }) => id === zoneId) ??
      this.world.parkedCars.find(({ id }) => id === zoneId) ??
      this.world.driveways.find(({ id }) => id === zoneId) ??
      this.world.zones.find(({ id }) => id === zoneId)
    );
  }
}
