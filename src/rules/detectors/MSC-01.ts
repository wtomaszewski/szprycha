import {
  TICKS_PER_SECOND,
  verdict,
  type AgentState,
  type EnvState,
  type RiderState,
} from '../types';
import { contains, type Crossing, type WorldModel } from '../world/WorldModel';
import { distanceInto } from '../priority/ConflictGeometry';

export class RailwayDetector {
  private crossing?: Crossing;
  private inside = false;
  private penalized = false;
  private passed = false;
  private stoppedAt?: number;
  private readonly ahead = new Set<string>();

  constructor(private readonly world: WorldModel) {}

  evaluate(
    rider: RiderState,
    agents: readonly AgentState[],
    at: number,
    env: EnvState,
  ) {
    let crossing: Crossing | undefined;
    for (const box of this.world.crossings) {
      if (
        box.kind !== 'rail' ||
        (!contains(box, rider.pos) &&
          distanceInto(box, rider.pos, rider.heading) > 100)
      )
        continue;
      crossing = box;
      break;
    }
    if (crossing !== this.crossing) {
      this.crossing = crossing;
      this.inside = false;
      this.penalized = false;
      this.passed = false;
      this.stoppedAt = undefined;
      this.ahead.clear();
    }
    if (!crossing) return;
    const inside = contains(crossing, rider.pos);
    const rail =
      inside && !this.inside
        ? this.world.railState(crossing, at, env)
        : undefined;
    this.inside = inside;
    if (!this.penalized && rail && (rail.flashing || rail.barrier !== 'open')) {
      this.penalized = true;
      return verdict(
        'MSC-01',
        'major',
        at,
        rider,
        { ...rail },
        { zoneId: crossing.id },
      );
    }
    if (inside && rider.mode === 'riding' && rider.speed < 0.1) {
      this.stoppedAt ??= Math.round(at * TICKS_PER_SECOND);
      if (
        !this.penalized &&
        at * TICKS_PER_SECOND - this.stoppedAt >= TICKS_PER_SECOND / 2
      ) {
        this.penalized = true;
        return verdict(
          'MSC-01',
          'major',
          at,
          rider,
          { stoppedOnTracks: true },
          { zoneId: crossing.id },
        );
      }
    } else this.stoppedAt = undefined;
    if (inside || this.passed || rider.mode !== 'riding' || rider.speed <= 0) {
      this.ahead.clear();
      return;
    }
    const dx = Math.cos(rider.heading);
    const dy = Math.sin(rider.heading);
    for (const agent of agents) {
      if (
        (agent.kind !== 'car' && agent.kind !== 'cyclist') ||
        agent.speed <= 0 ||
        Math.cos(rider.heading - agent.heading) < 0.9 ||
        distanceInto(crossing, agent.pos, agent.heading) > 100
      )
        continue;
      const x = agent.pos.x - rider.pos.x;
      const y = agent.pos.y - rider.pos.y;
      const along = x * dx + y * dy;
      const side = y * dx - x * dy;
      if (Math.abs(side) > 4 || Math.abs(along) > 8) {
        this.ahead.delete(agent.id);
      } else if (along > 0.5) {
        this.ahead.add(agent.id);
      } else if (along < -0.5 && this.ahead.delete(agent.id)) {
        this.passed = true;
        return verdict(
          'MSC-01',
          'minor',
          at,
          rider,
          { overtook: agent.id },
          { zoneId: crossing.id, agentId: agent.id },
        );
      }
    }
  }
}
