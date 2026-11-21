import { verdict, type RiderState } from '../types';
import type { PriorityConflict } from '../priority/IntersectionManager';
import type { Lane } from '../world/WorldModel';

export function yieldSign(
  kind: 'minor' | 'major',
  lane: Lane,
  rider: RiderState,
  at: number,
  conflict: PriorityConflict,
) {
  if (lane.stopSign?.code !== 'A-7') return;
  return verdict(
    'ZNAK-A7',
    kind,
    at,
    rider,
    {
      conflictWith: conflict.agentId,
      ttc: conflict.ttc,
      protectiveBrake: conflict.protectiveBrake,
    },
    {
      signId: lane.stopSign.id,
      agentId: conflict.agentId,
      zoneId: lane.intersection.id,
    },
  );
}
