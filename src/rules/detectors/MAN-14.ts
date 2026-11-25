import { agentFootprint, trafficFootprints } from '../world/Footprint';
import {
  verdict,
  type AgentState,
  type RiderState,
  type Verdict,
} from '../types';

// The simulation uses a margin beyond the vehicle outlines. The law does not
// specify a numeric minimum for an oncoming pass.
const safetyMargin = 0.55;

export class MeetingDetector {
  private readonly reported = new Set<string>();

  evaluate(
    rider: RiderState,
    agents: readonly AgentState[],
    at: number,
    emit: (result: Verdict) => void,
  ) {
    if (rider.mode !== 'riding' || rider.speed <= 0) return;
    const x = Math.cos(rider.heading);
    const y = Math.sin(rider.heading);
    for (const agent of agents) {
      if (!agent.cycleBody) continue;
      const dx = agent.pos.x - rider.pos.x;
      const dy = agent.pos.y - rider.pos.y;
      const forward = dx * x + dy * y;
      const side = Math.abs(dx * y - dy * x);
      if (Math.abs(forward) > 5 || side > 3.5) {
        this.reported.delete(agent.id);
        continue;
      }
      if (
        Math.cos(agent.heading - rider.heading) > -0.9 ||
        this.reported.has(agent.id)
      )
        continue;
      const { halfLength, halfWidth } = agentFootprint(agent);
      const gap = side - halfWidth - trafficFootprints.cyclist.halfWidth;
      const alongside = Math.abs(forward) <= halfLength;
      const unsafeApproach = agent.protectiveBrake && forward > 0 && gap < 0;
      if (!alongside && !unsafeApproach) continue;
      this.reported.add(agent.id);
      emit(
        verdict(
          'MAN-14',
          gap < safetyMargin ? 'minor' : 'good',
          at,
          rider,
          { clearance: gap },
          { agentId: agent.id },
        ),
      );
    }
  }
}
