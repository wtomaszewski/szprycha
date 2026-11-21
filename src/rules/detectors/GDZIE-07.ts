import { timeToConflict } from '../priority/ConflictGeometry';
import { verdict, type AgentState, type RiderState } from '../types';
import { contains, type Zone } from '../world/WorldModel';

export function livingZone(
  zone: Zone,
  rider: RiderState,
  agents: readonly AgentState[],
  at: number,
  ttc: number,
) {
  const pedestrian = agents.find(
    (agent) =>
      agent.kind === 'pedestrian' &&
      contains(zone, agent.pos) &&
      timeToConflict(rider, agent, 0.75) < ttc,
  );
  if (pedestrian || rider.speed > 20 / 3.6)
    return verdict(
      'GDZIE-07',
      'minor',
      at,
      rider,
      {
        speed: rider.speed,
        ...(pedestrian && { pedestrian: pedestrian.id }),
      },
      { zoneId: zone.id, agentId: pedestrian?.id },
    );
}
