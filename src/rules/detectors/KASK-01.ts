import { verdict, type RiderState } from '../types';

export class HelmetDetector {
  private praised = false;
  private penalized = false;

  evaluate(rider: RiderState, at: number) {
    if (rider.helmet.worn && rider.helmet.fastened) {
      this.penalized = false;
      if (rider.mode === 'riding' && rider.speed > 0 && !this.praised) {
        this.praised = true;
        return verdict('KASK-01', 'good', at, rider);
      }
    } else if (
      rider.ageBand !== '16plus' &&
      rider.mode === 'riding' &&
      rider.speed > 0 &&
      !this.penalized
    ) {
      this.penalized = true;
      return verdict('KASK-01', 'major', at, rider, {
        ageBand: rider.ageBand,
        worn: rider.helmet.worn,
      });
    }
  }
}
