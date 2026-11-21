import { BRAKE_DECELERATION } from '../../gameplay/bicycle';
import { distanceInto, timeToConflict } from '../priority/ConflictGeometry';
import {
  verdict,
  type AgentState,
  type EnvState,
  type RiderState,
} from '../types';
import { contains, type WorldModel, type Zone } from '../world/WorldModel';

export function safeSpeed(
  world: WorldModel,
  zone: Zone,
  rider: RiderState,
  agents: readonly AgentState[],
  at: number,
  env: EnvState,
) {
  const grip =
    env.weather === 'ice'
      ? 0.35
      : env.weather === 'clear' || env.weather === 'fog'
        ? 1
        : 0.65;
  const brake = BRAKE_DECELERATION * world.metersPerPixel * grip;
  const stopping = rider.speed * 0.75 + rider.speed ** 2 / (2 * brake);
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
