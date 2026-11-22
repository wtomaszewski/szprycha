import { verdict, type RiderState, type Verdict } from '../types';
import { sideVector, type Sign } from '../world/WorldModel';

export function facesRider(sign: Sign, rider: RiderState) {
  const direction = sideVector[sign.facing];
  return (
    Math.cos(rider.heading) * direction.x +
      Math.sin(rider.heading) * direction.y <=
    -Math.SQRT1_2
  );
}

export function noEntry(
  sign: Sign,
  rider: RiderState,
  at: number,
  kind: Exclude<Verdict['kind'], 'good'> | null,
) {
  if (kind && !sign.exceptBicycles && facesRider(sign, rider))
    return verdict('ZNAK-B2T22', kind, at, rider, {}, { signId: sign.id });
}
