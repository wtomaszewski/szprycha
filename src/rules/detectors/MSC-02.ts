import { verdict, type AgentState, type RiderState } from '../types';
import { contains, type Box } from '../world/WorldModel';
import { distanceInto } from '../priority/ConflictGeometry';

export class TramStopDetector {
  private stop?: Box;
  private passed = false;
  private waited = false;

  evaluate(
    rider: RiderState,
    agents: readonly AgentState[],
    at: number,
    stops: readonly Box[],
  ) {
    const tram = agents.find((agent) => agent.kind === 'tram' && agent.stopId);
    const stop = tram && stops.find(({ id }) => id === tram.stopId);
    if (stop !== this.stop) {
      const previous = this.stop;
      const waited = this.waited && !this.passed;
      this.stop = stop;
      this.passed = Boolean(stop && contains(stop, rider.pos));
      this.waited = false;
      if (
        previous &&
        waited &&
        rider.mode === 'riding' &&
        distanceInto(previous, rider.pos, rider.heading) <= 3
      )
        return verdict(
          'MSC-02',
          'good',
          at,
          rider,
          {},
          { zoneId: previous.id },
        );
    }
    if (
      !stop ||
      this.passed ||
      rider.mode !== 'riding' ||
      distanceInto(stop, rider.pos, rider.heading) > 3
    )
      return;
    if (rider.speed < 0.1 && !contains(stop, rider.pos)) {
      this.waited = true;
      return;
    }
    if (rider.speed > 0 && contains(stop, rider.pos)) {
      this.passed = true;
      return verdict(
        'MSC-02',
        'major',
        at,
        rider,
        {},
        { zoneId: stop.id, agentId: tram?.id },
      );
    }
  }
}
