import { verdict, type AgentState, type RiderState } from '../types';
import { contains, type Crossing } from '../world/WorldModel';
import { distanceInto, timeToConflict } from '../priority/ConflictGeometry';

export class BikeCrossingDetector {
  private crossing?: Crossing;
  private entered = false;
  private waited?: string;
  private fastest = 0;

  evaluate(
    rider: RiderState,
    agents: readonly AgentState[],
    at: number,
    crossings: readonly Crossing[],
    minorTtc: number,
    majorTtc: number,
  ) {
    const crossing =
      rider.mode === 'riding'
        ? crossings.find(
            (box) =>
              (box.kind === 'bike' || box.kind === 'combined') &&
              (box.axis === 'x'
                ? Math.abs(Math.cos(rider.heading)) > Math.SQRT1_2
                : Math.abs(Math.sin(rider.heading)) > Math.SQRT1_2) &&
              distanceInto(box, rider.pos, rider.heading) <= 3,
          )
        : undefined;
    if (crossing !== this.crossing) {
      this.crossing = crossing;
      this.entered = false;
      this.waited = undefined;
      this.fastest = 0;
    }
    if (!crossing || this.entered) return;
    const inside = contains(crossing, rider.pos);
    this.fastest = Math.max(this.fastest, rider.speed);
    let minor;
    for (const agent of agents) {
      if (
        agent.kind !== 'car' &&
        agent.kind !== 'tram' &&
        agent.kind !== 'emergency'
      )
        continue;
      const distance = distanceInto(crossing, agent.pos, agent.heading);
      const perpendicular =
        Math.abs(Math.cos(rider.heading - agent.heading)) < Math.SQRT1_2;
      if (
        !perpendicular ||
        distance > 12 ||
        (agent.speed <= 0 && !agent.protectiveBrake)
      )
        continue;
      if (!inside) {
        if (
          agent.speed > 0 &&
          distance / agent.speed < minorTtc &&
          (rider.speed < 0.1 || rider.speed < this.fastest - 0.25)
        )
          this.waited = agent.id;
        continue;
      }
      const ttc = timeToConflict(rider, agent, 1);
      const blocked = agent.protectiveBrake && distance <= 3;
      if (rider.speed > 0 && (ttc + 1e-9 < minorTtc || blocked)) {
        const kind = blocked || ttc + 1e-9 < majorTtc ? 'major' : 'minor';
        const candidate = verdict(
          'PIER-05',
          kind,
          at,
          rider,
          { conflictWith: agent.id, ttc, protectiveBrake: Boolean(blocked) },
          { zoneId: crossing.id, agentId: agent.id },
        );
        if (kind === 'major') {
          this.entered = true;
          return candidate;
        }
        if (!minor || ttc < Number(minor.evidence.ttc)) minor = candidate;
      }
    }
    if (inside && rider.speed > 0) {
      this.entered = true;
      if (minor) return minor;
      if (this.waited)
        return verdict(
          'PIER-05',
          'good',
          at,
          rider,
          { conflictWith: this.waited },
          { zoneId: crossing.id, agentId: this.waited },
        );
    }
  }
}
