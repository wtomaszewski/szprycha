import { verdict, type RiderState, type Verdict } from '../types';
import type { PriorityConflict } from '../priority/IntersectionManager';
import type { Lane } from '../world/WorldModel';

export const subordinateRoad = (
  kind: Verdict['kind'],
  rider: RiderState,
  at: number,
  lane: Lane,
  conflict: PriorityConflict,
) =>
  verdict(
    'PIER-02',
    kind,
    at,
    rider,
    {
      conflictWith: conflict.agentId,
      ttc: conflict.ttc,
      protectiveBrake: conflict.protectiveBrake,
    },
    {
      zoneId: lane.intersection.id,
      agentId: conflict.agentId,
      signId: lane.stopSign?.id,
    },
  );
