import { verdict, type RiderState, type SignalPhase } from '../types';
import type { Lane } from '../world/WorldModel';

export function trafficLight(
  lane: Lane,
  rider: RiderState,
  at: number,
  phase: SignalPhase,
  stoppedForLight: boolean,
  couldStopOnYellow: boolean,
) {
  const kind =
    phase === 'red' || phase === 'red-yellow' || phase === 'arrow'
      ? 'major'
      : phase === 'yellow' && couldStopOnYellow
        ? 'minor'
        : stoppedForLight && phase === 'green'
          ? 'good'
          : undefined;
  if (kind)
    return verdict(
      'SYG-01',
      kind,
      at,
      rider,
      { phase },
      { signId: lane.mainSignal?.id },
    );
}
