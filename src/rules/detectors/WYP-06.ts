import { verdict, type RiderState } from '../types';

export class ReflectorsDetector {
  private praised = false;

  evaluate(rider: RiderState, at: number) {
    if (
      !this.praised &&
      rider.extraReflectors &&
      rider.mode === 'riding' &&
      rider.speed > 0
    ) {
      this.praised = true;
      return verdict('WYP-06', 'good', at, rider);
    }
  }
}
