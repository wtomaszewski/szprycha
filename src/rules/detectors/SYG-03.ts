import { verdict, type RiderState } from '../types';
import type { Lane } from '../world/WorldModel';

export function officerStop(lane: Lane, rider: RiderState, at: number) {
  return verdict(
    'SYG-03',
    'major',
    at,
    rider,
    { order: 'stop', lane: lane.id },
    {
      zoneId: lane.intersection.id,
    },
  );
}
