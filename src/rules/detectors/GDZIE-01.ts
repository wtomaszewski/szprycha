import { TICKS_PER_SECOND, verdict, type RiderState } from '../types';
import type { ZoneTracker } from '../world/ZoneTracker';

export class BikeInfrastructureDetector {
  private id?: string;
  private elapsed = 0;
  private lastActive = -Infinity;
  private penalized = false;
  private praised?: string;

  evaluate(rider: RiderState, world: ZoneTracker, tick: number) {
    if (rider.mode !== 'riding') return;
    const at = tick / TICKS_PER_SECOND;
    const id = world.parallelBikeInfra;
    if (!id) {
      if (
        world.followsBikePath &&
        world.zone &&
        rider.speed > 0 &&
        world.zone.id !== this.praised
      ) {
        this.praised = world.zone.id;
        return verdict(
          'GDZIE-01',
          'good',
          at,
          rider,
          {},
          { zoneId: world.zone.id },
        );
      }
      return;
    }
    if (this.id !== id || tick - this.lastActive > 0.25 * TICKS_PER_SECOND) {
      this.id = id;
      this.elapsed = 0;
      this.penalized = false;
    }
    if (rider.speed > 0 && this.lastActive === tick - 1) this.elapsed++;
    this.lastActive = tick;
    if (this.elapsed > 3 * TICKS_PER_SECOND && !this.penalized) {
      this.penalized = true;
      return verdict(
        'GDZIE-01',
        'minor',
        at,
        rider,
        { seconds: this.elapsed / TICKS_PER_SECOND },
        { zoneId: id },
      );
    }
  }
}
