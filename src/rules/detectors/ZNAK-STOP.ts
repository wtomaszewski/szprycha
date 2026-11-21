import { verdict, type RiderState } from '../types';
import type { Lane } from '../world/WorldModel';

export function stopSign(
  lane: Lane,
  stopped: boolean,
  rider: RiderState,
  at: number,
) {
  if (lane.stopSign?.code === 'B-20') {
    return verdict(
      'ZNAK-STOP',
      stopped ? 'good' : 'minor',
      at,
      rider,
      { stopped },
      { signId: lane.stopSign.id },
    );
  }
}
