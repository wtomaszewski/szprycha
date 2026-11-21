import { verdict, type RiderState, type Verdict } from '../types';
import type { Sign } from '../world/WorldModel';

export function noVehicles(
  sign: Sign,
  rider: RiderState,
  at: number,
  weight: Exclude<Verdict['kind'], 'good'> | null,
) {
  if (!sign.exceptBicycles && weight)
    return verdict('ZNAK-B1', weight, at, rider, {}, { signId: sign.id });
}
