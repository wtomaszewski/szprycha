import { verdict, type AgentState, type RiderState } from '../types';
import {
  contains,
  type Crossing,
  type Intersection,
} from '../world/WorldModel';
import { distanceInto } from '../priority/ConflictGeometry';

export class TurningCrossingDetector {
  private junction?: Intersection;
  private heading = 0;
  private turning = false;
  private readonly handled = new Set<Crossing>();
  private waited?: { crossing: Crossing; agentId: string };
  private fastest = 0;

  evaluate(
    rider: RiderState,
    agents: readonly AgentState[],
    at: number,
    intersection: Intersection | undefined,
    crossings: readonly Crossing[],
  ) {
    if (rider.mode !== 'riding') {
      this.junction = undefined;
      return;
    }
    if (intersection && intersection !== this.junction) {
      this.junction = intersection;
      this.heading = rider.heading;
      this.turning = false;
      this.handled.clear();
      this.waited = undefined;
      this.fastest = rider.speed;
    }
    if (!this.junction) return;
    const { x, y, width, height } = this.junction;
    if (!intersection && !contains(this.junction, rider.pos, 5)) {
      this.junction = undefined;
      return;
    }
    if (
      rider.maneuver === 'left' ||
      rider.maneuver === 'right' ||
      Math.cos(rider.heading - this.heading) < Math.SQRT1_2
    )
      this.turning = true;
    if (!this.turning) return;
    const dx = Math.cos(rider.heading);
    const dy = Math.sin(rider.heading);
    const vx = Math.abs(dx) > Math.abs(dy);
    // Only crossings outside the junction, in the direction of the exit.
    this.fastest = Math.max(this.fastest, rider.speed);
    for (const crossing of crossings) {
      if (
        this.handled.has(crossing) ||
        crossing.kind === 'rail' ||
        (vx ? crossing.axis !== 'y' : crossing.axis !== 'x') ||
        !(vx
          ? dx > 0
            ? crossing.x >= x + width - 1e-6
            : crossing.x + crossing.width <= x + 1e-6
          : dy > 0
            ? crossing.y >= y + height - 1e-6
            : crossing.y + crossing.height <= y + 1e-6) ||
        distanceInto(crossing, rider.pos, rider.heading) > 3
      )
        continue;
      const person = agents.find(
        (agent) =>
          ((agent.kind === 'pedestrian' && crossing.kind !== 'bike') ||
            (agent.kind === 'cyclist' && crossing.kind !== 'pedestrian')) &&
          (contains(crossing, agent.pos) || agent.crossingId === crossing.id) &&
          Math.hypot(agent.pos.x - rider.pos.x, agent.pos.y - rider.pos.y) <= 4,
      );
      if (!contains(crossing, rider.pos)) {
        if (
          person &&
          (rider.speed < 0.1 || rider.speed < this.fastest - 0.25) &&
          this.waited?.crossing !== crossing
        )
          this.waited = { crossing, agentId: person.id };
        continue;
      }
      if (rider.speed <= 0) continue;
      const agentId =
        person?.id ??
        (this.waited?.crossing === crossing ? this.waited.agentId : undefined);
      this.handled.add(crossing);
      if (agentId) {
        this.waited = undefined;
        return verdict(
          'PIER-04',
          person ? 'major' : 'good',
          at,
          rider,
          { conflictWith: agentId },
          { zoneId: crossing.id, agentId },
        );
      }
    }
  }
}
