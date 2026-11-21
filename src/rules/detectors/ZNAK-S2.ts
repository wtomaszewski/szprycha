import { verdict, type RiderState } from '../types';
import type { Lane } from '../world/WorldModel';

export function conditionalArrow(
  lane: Lane,
  rider: RiderState,
  at: number,
  stopped: boolean,
) {
  return verdict(
    'ZNAK-S2',
    stopped ? 'good' : 'minor',
    at,
    rider,
    { stopped },
    { signId: lane.arrow?.id },
  );
}
