import { verdict, type AgentState, type RiderState } from '../types';

export class EmergencyYieldDetector {
  private id?: string;
  private firstSide = 0;
  private yielded = false;
  private obstructed = false;

  evaluate(rider: RiderState, agents: readonly AgentState[], at: number) {
    // The same heading and approach range as the traffic simulation's pull-over.
    const emergency = agents.find((agent) => {
      if (agent.kind !== 'emergency' || !agent.signalActive) return false;
      const dx = rider.pos.x - agent.pos.x;
      const dy = rider.pos.y - agent.pos.y;
      const along = dx * Math.cos(agent.heading) + dy * Math.sin(agent.heading);
      const side = dy * Math.cos(agent.heading) - dx * Math.sin(agent.heading);
      return (
        (agent.id === this.id ||
          Math.cos(rider.heading - agent.heading) > 0.98) &&
        along > -5 &&
        along < 16 &&
        Math.abs(side) < 4
      );
    });
    if (!emergency) {
      this.id = undefined;
      return;
    }
    const dx = rider.pos.x - emergency.pos.x;
    const dy = rider.pos.y - emergency.pos.y;
    const side =
      dy * Math.cos(emergency.heading) - dx * Math.sin(emergency.heading);
    const along =
      dx * Math.cos(emergency.heading) + dy * Math.sin(emergency.heading);
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
