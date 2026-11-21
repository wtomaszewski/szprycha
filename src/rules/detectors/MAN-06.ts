import { verdict, type RiderState } from '../types';
import type { Box } from '../world/WorldModel';

export class ParkedClearanceDetector {
  private car?: Box;
  private closest = Infinity;
  private penalized = false;
  private beside = false;

  evaluate(rider: RiderState, at: number, cars: readonly Box[], limit: number) {
    const dx = Math.cos(rider.heading);
    const dy = Math.sin(rider.heading);
    const car =
      rider.mode === 'riding'
        ? cars.find((box) => {
            const x = box.x + box.width / 2 - rider.pos.x;
            const y = box.y + box.height / 2 - rider.pos.y;
            return (
              Math.abs(x * dx + y * dy) <= 3 && Math.abs(y * dx - x * dy) <= 3
            );
          })
        : undefined;
    let good;
    if (car !== this.car) {
      if (this.car && this.beside && !this.penalized && rider.mode === 'riding')
        good = verdict(
          'MAN-06',
          'good',
          at,
          rider,
          { clearance: this.closest },
          { zoneId: this.car.id },
        );
      this.car = car;
      this.closest = Infinity;
      this.penalized = false;
      this.beside = false;
    }
    if (!car || rider.speed <= 0) return good;
    const x = car.x + car.width / 2 - rider.pos.x;
    const y = car.y + car.height / 2 - rider.pos.y;
    if (
      Math.abs(x * dx + y * dy) >
      (Math.abs(dx) * car.width + Math.abs(dy) * car.height) / 2
    )
      return good;
    if (x * dx + y * dy <= 0) this.beside = true;
    const clearance = Math.max(
      0,
      Math.abs(y * dx - x * dy) -
        (Math.abs(dy) * car.width + Math.abs(dx) * car.height) / 2,
    );
    this.closest = Math.min(this.closest, clearance);
    if (!this.penalized && clearance <= limit + 1e-9) {
      this.penalized = true;
      return verdict(
        'MAN-06',
        'minor',
        at,
        rider,
        { clearance },
        { zoneId: car.id },
      );
    }
    return good;
  }
}
