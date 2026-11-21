import { verdict, type RiderState } from '../types';

export class PassengerDetector {
  private penalized = false;

  evaluate(rider: RiderState, at: number) {
    if (!rider.passenger || rider.mode !== 'riding') this.penalized = false;
    else if (rider.speed > 0 && !this.penalized) {
      this.penalized = true;
      return verdict('MAN-10', 'major', at, rider, { passenger: true });
    }
  }
}
