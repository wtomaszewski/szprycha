import type { PassingObservation } from '../priority/PassingMonitor';
import { verdict, type RiderState } from '../types';

export function restrictedPassing(
  pass: PassingObservation,
  rider: RiderState,
  at: number,
) {
  if (pass.restricted || pass.yieldingAtCrossing)
    return verdict(
      'MAN-12',
      'major',
      at,
      rider,
      {
        ...(pass.restricted && { area: pass.restricted }),
        yieldingAtCrossing: pass.yieldingAtCrossing,
      },
      { zoneId: pass.restricted, agentId: pass.id },
    );
}
