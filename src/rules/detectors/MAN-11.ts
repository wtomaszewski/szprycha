import { verdict, type RiderState } from '../types';

export class PhoneDetector {
  private held = false;
  private penalized = false;

  evaluate(rider: RiderState, at: number, safePlace: boolean) {
    const wasHeld = this.held;
    this.held = Boolean(rider.phoneInHand);
    if (!this.held) {
      this.penalized = false;
      return;
    }
    if (rider.mode === 'riding' && rider.speed > 0.1 && !this.penalized) {
      this.penalized = true;
      return verdict('MAN-11', 'minor', at, rider, { speed: rider.speed });
    }
    if (!wasHeld && safePlace && rider.speed < 0.1)
      return verdict('MAN-11', 'good', at, rider, { stopped: true });
  }
}
