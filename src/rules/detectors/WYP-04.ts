import { verdict, type RiderState } from '../types';

export function frontLight(rider: RiderState, at: number, on: boolean) {
  return verdict('WYP-04', on ? 'good' : 'minor', at, rider, { front: on });
}
