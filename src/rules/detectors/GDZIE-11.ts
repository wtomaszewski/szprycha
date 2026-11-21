import { timeToConflict } from '../priority/ConflictGeometry';
import { verdict, type AgentState, type RiderState } from '../types';
import { contains, type Zone } from '../world/WorldModel';

export function sharedPath(
  zone: Zone,
  rider: RiderState,
  agents: readonly AgentState[],
  at: number,
  limit: number,
  ttc: number,
) {
  if (zone.sharedSide === 'bike') return;
  const pedestrian = agents.find(
    (agent) =>
      agent.kind === 'pedestrian' &&
      contains(zone, agent.pos) &&
      Math.hypot(agent.pos.x - rider.pos.x, agent.pos.y - rider.pos.y) <= 3 &&
      (rider.speed > limit || timeToConflict(rider, agent, 0.75) < ttc),
  );
  if (zone.sharedSide === 'pedestrian' || pedestrian)
    return verdict(
      'GDZIE-11',
      'minor',
      at,
      rider,
      {
        ...(pedestrian && { pedestrian: pedestrian.id }),
        ...(zone.sharedSide && { side: zone.sharedSide }),
      },
      { zoneId: zone.id, agentId: pedestrian?.id },
    );
}
