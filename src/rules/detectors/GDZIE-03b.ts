import { verdict, type AgentState, type RiderState } from '../types';
import { contains, sideVector, type Lane } from '../world/WorldModel';

export function useShoulder(
  lane: Lane,
  rider: RiderState,
  agents: readonly AgentState[],
  at: number,
) {
  const shoulder = lane.shoulder;
  if (lane.parallelBikeInfra || !shoulder?.shoulderUsable) return;
  const horizontal = Math.abs(lane.forward.x) > Math.abs(lane.forward.y);
  const offset = horizontal
    ? rider.pos.x - shoulder.x
    : rider.pos.y - shoulder.y;
  if (offset < 0 || offset >= (horizontal ? shoulder.width : shoulder.height))
    return;
  if (
    agents.some(
      (agent) =>
        contains(shoulder, agent.pos) &&
        Math.hypot(agent.pos.x - rider.pos.x, agent.pos.y - rider.pos.y) <= 6,
    )
  )
    return;
  const direction = shoulder.direction && sideVector[shoulder.direction];
  if (
    direction &&
    lane.forward.x * direction.x + lane.forward.y * direction.y < Math.SQRT1_2
  )
    return;
  return verdict(
    'GDZIE-03b',
    'minor',
    at,
    rider,
    { lane: lane.id },
    { zoneId: shoulder.id },
  );
}
