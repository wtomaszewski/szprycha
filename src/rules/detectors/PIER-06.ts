import { timeToConflict } from '../priority/ConflictGeometry';
import {
  verdict,
  type AgentState,
  type RiderState,
  type Verdict,
} from '../types';

export function joiningConflict(
  rider: RiderState,
  agents: readonly AgentState[],
  minorTtc: number,
) {
  return agents.find((agent) => {
    if (
      agent.speed <= 0 &&
      !agent.protectiveBrake &&
      agent.kind !== 'pedestrian'
    )
      return false;
    const distance = Math.hypot(
      rider.pos.x - agent.pos.x,
      rider.pos.y - agent.pos.y,
    );
    return (
      distance < 8 &&
      (timeToConflict(rider, agent, 0.9) + 1e-9 < minorTtc ||
        (agent.protectiveBrake && distance < 2))
    );
  });
}

export function joiningTraffic(
  rider: RiderState,
  at: number,
  kind: Verdict['kind'],
  agentId: string,
  source: { id: string },
) {
  return verdict(
    'PIER-06',
    kind,
    at,
    rider,
    { conflictWith: agentId },
    { zoneId: source.id, agentId },
  );
}
