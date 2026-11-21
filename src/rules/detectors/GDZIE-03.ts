import { verdict, type RiderState, type Vec2 } from '../types';
import type { Zone } from '../world/WorldModel';

export const RIGHT_EDGE_RANGE = 2;
export const EDGE_TOLERANCE = 1e-9;

export function rightEdgeDistance(road: Zone, pos: Vec2, heading: number) {
  if (road.width > road.height)
    return Math.cos(heading) >= 0
      ? road.y + road.height - pos.y
      : pos.y - road.y;
  return Math.sin(heading) >= 0 ? pos.x - road.x : road.x + road.width - pos.x;
}

export function keepRight(road: Zone, rider: RiderState, at: number) {
  const distance = rightEdgeDistance(road, rider.pos, rider.heading);
  if (distance > RIGHT_EDGE_RANGE + EDGE_TOLERANCE)
    return verdict(
      'GDZIE-03',
      'minor',
      at,
      rider,
      { distance },
      { zoneId: road.id },
    );
}
