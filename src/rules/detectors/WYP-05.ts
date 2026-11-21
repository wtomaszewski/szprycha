import { verdict, type RiderState } from '../types';

export function rearLight(rider: RiderState, at: number) {
  return verdict('WYP-05', 'minor', at, rider, { rear: false });
}
