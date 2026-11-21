import { verdict, type AgentState, type RiderState } from '../types';
import { contains, type Crossing } from '../world/WorldModel';

export function pedestrianCrossing(
  crossing: Crossing,
  rider: RiderState,
  agents: readonly AgentState[],
  at: number,
) {
  const pedestrian =
    rider.mode === 'riding' &&
    agents.find(
      (agent) =>
        agent.kind === 'pedestrian' &&
        contains(crossing, agent.pos) &&
        Math.hypot(rider.pos.x - agent.pos.x, rider.pos.y - agent.pos.y) <= 4,
    );
  return verdict(
    'GDZIE-06',
    rider.mode === 'walking_bike' ? 'good' : pedestrian ? 'major' : 'minor',
    at,
    rider,
    pedestrian ? { pedestrian: pedestrian.id } : {},
    { zoneId: crossing.id, ...(pedestrian && { agentId: pedestrian.id }) },
  );
}
