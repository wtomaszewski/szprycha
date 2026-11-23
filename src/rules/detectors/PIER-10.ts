import { distanceInto } from '../priority/ConflictGeometry';
import { verdict, type AgentState, type RiderState } from '../types';
import { contains, type Crossing } from '../world/WorldModel';

export class PlatformCrossingDetector {
  private crossing?: Crossing;
  private waitedFor?: string;
  private reported = false;

  evaluate(
    rider: RiderState,
    agents: readonly AgentState[],
    at: number,
    crossings: readonly Crossing[],
  ) {
    const dx = Math.cos(rider.heading);
    const dy = Math.sin(rider.heading);
    const crossing =
      rider.mode === 'riding'
        ? crossings.find(
            (area) =>
              (area.axis === 'x'
                ? Math.abs(dx) < Math.abs(dy)
                : Math.abs(dy) < Math.abs(dx)) &&
              distanceInto(area, rider.pos, rider.heading) <= 3,
          )
        : undefined;
    if (crossing !== this.crossing) {
      this.crossing = crossing;
      this.waitedFor = undefined;
      this.reported = false;
    }
    if (!crossing || this.reported) return;
    const pedestrian = agents.find(
      (agent) =>
        agent.kind === 'pedestrian' &&
        (agent.crossingId === crossing.id || contains(crossing, agent.pos)) &&
        this.inRiderPath(crossing, rider, agent),
    );
    if (!contains(crossing, rider.pos)) {
      if (pedestrian && rider.speed < 0.1) this.waitedFor = pedestrian.id;
      return;
    }
    if (rider.speed <= 0 || (!pedestrian && !this.waitedFor)) return;
    this.reported = true;
    return verdict(
      'PIER-10',
      pedestrian ? 'major' : 'good',
      at,
      rider,
      {},
      {
        zoneId: crossing.id,
        agentId: pedestrian?.id ?? this.waitedFor,
      },
    );
  }

  private inRiderPath(
    crossing: Crossing,
    rider: RiderState,
    pedestrian: AgentState,
  ) {
    const acrossX = crossing.axis === 'x';
    const gap = acrossX
      ? rider.pos.x - pedestrian.pos.x
      : rider.pos.y - pedestrian.pos.y;
    const direction = acrossX
      ? Math.cos(pedestrian.heading)
      : Math.sin(pedestrian.heading);
    return Math.abs(gap) <= 0.8 || gap * direction > 0;
  }
}
