import { verdict, type AgentState, type RiderState } from '../types';

export class EmergencyYieldDetector {
  private id?: string;
  private firstSide = 0;
  private yielded = false;
  private obstructed = false;

  evaluate(rider: RiderState, agents: readonly AgentState[], at: number) {
    // The same heading and approach range as the traffic simulation's pull-over.
    let emergency: AgentState | undefined;
    let along = 0;
    let side = 0;
    for (const agent of agents) {
      if (agent.kind !== 'emergency' || !agent.signalActive) continue;
      if (
        agent.id !== this.id &&
        Math.cos(rider.heading - agent.heading) <= 0.98
      )
        continue;
      const dx = rider.pos.x - agent.pos.x;
      const dy = rider.pos.y - agent.pos.y;
      const cos = Math.cos(agent.heading);
      const sin = Math.sin(agent.heading);
      along = dx * cos + dy * sin;
      side = dy * cos - dx * sin;
      if (along > -5 && along < 16 && Math.abs(side) < 4) {
        emergency = agent;
        break;
      }
    }
    if (!emergency) {
      this.id = undefined;
      return;
    }
    if (this.id !== emergency.id) {
      if (along < 0 || Math.abs(side) > 1.5) return;
      this.id = emergency.id;
      this.firstSide = side;
      this.yielded = false;
      this.obstructed = false;
    }
    if (along >= 0 && side >= 1.5 && side - this.firstSide >= 0.5)
      this.yielded = true;
    if (
      !this.obstructed &&
      along >= 0 &&
      along < 6 &&
      Math.abs(side) < 1.25 &&
      emergency.protectiveBrake
    ) {
      this.obstructed = true;
      return verdict(
        'PIER-07',
        'major',
        at,
        rider,
        { conflictWith: emergency.id, protectiveBrake: true },
        { agentId: emergency.id },
      );
    }
    if (along < -2 && this.yielded && !this.obstructed) {
      this.yielded = false;
      return verdict(
        'PIER-07',
        'good',
        at,
        rider,
        { conflictWith: emergency.id },
        { agentId: emergency.id },
      );
    }
  }
}
