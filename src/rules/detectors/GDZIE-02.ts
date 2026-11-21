import { verdict, type RiderState } from '../types';
import type { Zone } from '../world/WorldModel';

export function bikeLaneDirection(zone: Zone, rider: RiderState, at: number) {
  return verdict(
    'GDZIE-02',
    'minor',
    at,
    rider,
    { direction: zone.direction },
    { zoneId: zone.id },
  );
}
