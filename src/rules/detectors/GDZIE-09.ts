import { verdict, type RiderState } from '../types';
import type { Sign, Zone } from '../world/WorldModel';

export function prohibitedRoad(
  zone: Zone,
  rider: RiderState,
  at: number,
  sign?: Sign,
) {
  return verdict(
    'GDZIE-09',
    'major',
    at,
    rider,
    {},
    { zoneId: zone.id, signId: sign?.id },
  );
}
