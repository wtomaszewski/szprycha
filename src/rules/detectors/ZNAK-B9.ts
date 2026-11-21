import { verdict, type RiderState } from '../types';
import type { Sign } from '../world/WorldModel';
import { facesRider } from './ZNAK-B2T22';

export function noBicycles(sign: Sign, rider: RiderState, at: number) {
  if (facesRider(sign, rider))
    return verdict('ZNAK-B9', 'minor', at, rider, {}, { signId: sign.id });
}
