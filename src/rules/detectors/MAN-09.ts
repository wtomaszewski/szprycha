import { verdict, type RiderState } from '../types';

export class RidingPositionDetector {
  private penalized = false;

  evaluate(rider: RiderState, at: number) {
    const badPosition =
      rider.mode === 'riding' &&
      rider.speed > 0 &&
      (rider.handsOnBar === 0 ||
        rider.feetOnPedals === false ||
        rider.holdingVehicle);
    if (!badPosition) this.penalized = false;
    else if (!this.penalized) {
      this.penalized = true;
      return verdict('MAN-09', 'minor', at, rider, {
        handsOnBar: rider.handsOnBar,
        feetOnPedals: rider.feetOnPedals,
        holdingVehicle: Boolean(rider.holdingVehicle),
      });
    }
  }
}
