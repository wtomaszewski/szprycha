import type { PassingObservation } from '../priority/PassingMonitor';
import { verdict, type RiderState } from '../types';

export function passingOnRight(
  pass: PassingObservation,
  rider: RiderState,
  at: number,
  clearance: number,
) {
  if (
    pass.moving &&
    pass.right &&
    (pass.clearance < clearance || pass.turningRight)
  )
    return verdict(
      'MAN-05',
      'minor',
      at,
      rider,
      { clearance: pass.clearance, turningRight: pass.turningRight },
      { agentId: pass.id },
    );
}
