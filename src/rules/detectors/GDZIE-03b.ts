import { verdict, type AgentState, type RiderState } from '../types';
import {
  contains,
  sideVector,
  type Lane,
  type Zone,
} from '../world/WorldModel';

export function shoulderApplies(
  shoulder: Zone,
  rider: RiderState,
  lane?: Lane,
) {
  if (lane?.parallelBikeInfra || !shoulder.shoulderUsable) return false;
  const forward = lane?.forward ?? {
    x: Math.cos(rider.heading),
    y: Math.sin(rider.heading),
  };
  const horizontal = Math.abs(forward.x) > Math.abs(forward.y);
  const offset = horizontal
    ? rider.pos.x - shoulder.x
    : rider.pos.y - shoulder.y;
  if (offset < 0 || offset >= (horizontal ? shoulder.width : shoulder.height))
    return false;
  const direction = shoulder.direction && sideVector[shoulder.direction];
  return (
    !direction ||
    forward.x * direction.x + forward.y * direction.y >= Math.SQRT1_2
  );
}

export function useShoulder(
  shoulder: Zone,
  rider: RiderState,
  agents: readonly AgentState[],
  at: number,
  lane?: Lane,
) {
  if (!shoulderApplies(shoulder, rider, lane)) return;
  if (
    agents.some(
      (agent) =>
        contains(shoulder, agent.pos) &&
        Math.hypot(agent.pos.x - rider.pos.x, agent.pos.y - rider.pos.y) <= 6,
    )
  )
    return;
  return verdict(
    'GDZIE-03b',
    'minor',
    at,
    rider,
    lane ? { lane: lane.id } : {},
    { zoneId: shoulder.id },
  );
}
