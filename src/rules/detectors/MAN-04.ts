import type { PassingObservation } from '../priority/PassingMonitor';
import { verdict, type RiderState } from '../types';

export function passingTechnique(
  pass: PassingObservation,
  rider: RiderState,
  at: number,
  clearance: number,
) {
  const kind =
    pass.clearance < clearance ||
    (pass.lateralMove === 'left' && !pass.prepared)
      ? 'minor'
      : pass.prepared
        ? 'good'
        : undefined;
  if (kind)
    return verdict(
      'MAN-04',
      kind,
      at,
      rider,
      {
        clearance: pass.clearance,
        prepared: pass.prepared,
      },
      { agentId: pass.id },
    );
}
