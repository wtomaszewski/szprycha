import { BRAKE_DECELERATION } from '../../gameplay/bicycle';
import { distanceInto, timeToConflict } from '../priority/ConflictGeometry';
import { verdict, type AgentState, type RiderState, type Vec2 } from '../types';
import { contains, type WorldModel, type Zone } from '../world/WorldModel';

function stoppingDistance(world: WorldModel, rider: RiderState, grip: number) {
  const brake = BRAKE_DECELERATION * world.metersPerPixel * grip;
  return rider.speed * 0.75 + rider.speed ** 2 / (2 * brake);
}

export interface RoadHazard {
  id: string;
  pos: Vec2;
  heading: number;
  speed: number;
  warned: boolean;
}

export function encounterSpeed(
  world: WorldModel,
  rider: RiderState,
  hazards: readonly RoadHazard[],
  at: number,
  grip: number,
) {
  if (rider.mode !== 'riding' || rider.speed <= 0.1) return;
  const timeToStop = stoppingDistance(world, rider, grip) / rider.speed;
  const hazard = hazards.find(
    (candidate) =>
      !candidate.warned && timeToConflict(rider, candidate, 0.8) < timeToStop,
  );
  if (!hazard) return;
  hazard.warned = true;
  return verdict(
    'MAN-08',
    'minor',
    at,
    rider,
    { hazard: hazard.id },
    { agentId: hazard.id },
  );
}

export function safeSpeed(
  world: WorldModel,
  zone: Zone,
  rider: RiderState,
  agents: readonly AgentState[],
  at: number,
  grip: number,
) {
  const stopping = stoppingDistance(world, rider, grip);
  const hazard = agents.find((agent) => {
    if (
      agent.kind !== 'pedestrian' ||
      Math.hypot(agent.pos.x - rider.pos.x, agent.pos.y - rider.pos.y) >
        stopping
    )
      return false;
    return timeToConflict(rider, agent, 0.75) < stopping / rider.speed;
  });
  if (hazard)
    return verdict(
      'MAN-08',
      'minor',
      at,
      rider,
      { stopping },
      { agentId: hazard.id },
    );
  if (zone.surface === 'rough' && stopping > 3)
    return verdict(
      'MAN-08',
      'minor',
      at,
      rider,
      { stopping, surface: zone.surface },
      { zoneId: zone.id },
    );
  const driveway = world.driveways.find(
    (box) =>
      distanceInto(box, rider.pos, rider.heading) < stopping &&
      agents.some(
        (agent) => agent.kind !== 'pedestrian' && contains(box, agent.pos),
      ),
  );
  if (driveway)
    return verdict(
      'MAN-08',
      'minor',
      at,
      rider,
      { stopping },
      { zoneId: driveway.id },
    );
}
