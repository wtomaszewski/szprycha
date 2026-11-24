import { gradeAcceleration, stoppingDistance } from '../world/RoadGrade.ts';
import { distanceInto, timeToConflict } from '../priority/ConflictGeometry';
import {
  verdict,
  type AgentState,
  type EnvState,
  type RiderState,
  type Vec2,
} from '../types';
import { contains, type WorldModel, type Zone } from '../world/WorldModel';

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
  const road = world.roadGradeAt(rider.pos.x, rider.pos.y);
  const acceleration = road ? gradeAcceleration(road, rider.heading) : 0;
  const timeToStop =
    stoppingDistance(rider.speed, world.metersPerPixel, grip, acceleration) /
    rider.speed;
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
  weather: EnvState['weather'],
) {
  const road = world.roadGradeAt(rider.pos.x, rider.pos.y);
  const acceleration = road ? gradeAcceleration(road, rider.heading) : 0;
  const stopping = stoppingDistance(
    rider.speed,
    world.metersPerPixel,
    grip,
    acceleration,
  );
  if (road) {
    const fog = weather === 'fog' || weather === 'fog_dense';
    const sight = fog ? road.fog_sight_m : road.sight_m;
    if ((acceleration > 0 || fog) && stopping > sight)
      return verdict('MAN-08', 'minor', at, rider, {
        roadGrade: road.id,
        stopping,
        sight,
      });
  }
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
