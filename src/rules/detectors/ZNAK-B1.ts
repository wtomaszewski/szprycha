import { verdict, type RiderState } from '../types';
import type { Sign } from '../world/WorldModel';

export function noVehicles(sign: Sign, rider: RiderState, at: number) {
  if (!sign.exceptBicycles)
    return verdict('ZNAK-B1', 'minor', at, rider, {}, { signId: sign.id });
}
