import { distanceInto } from '../priority/ConflictGeometry';
import type { RiderState } from '../types';
import {
  contains,
  sideVector,
  type WorldModel,
  type Crossing,
  type Intersection,
  type Lane,
  type Zone,
} from './WorldModel';

export class ZoneTracker {
  zone?: Zone;
  roadway?: Zone;
  cycleSignal?: Crossing;
  crossing?: Crossing;
  intersection?: Intersection;
  lane?: Lane;
  parallelBikeInfra?: string;
  followsBikePath = false;

  constructor(private readonly world: WorldModel) {}

  update(rider: RiderState) {
    const { pos, heading } = rider;
    this.zone = undefined;
    for (const zone of this.world.zones) {
      if (!contains(zone, pos)) continue;
      this.zone = zone;
      break;
    }
    const dx = Math.cos(heading);
    const dy = Math.sin(heading);
    this.crossing = undefined;
    for (const crossing of this.world.crossings) {
      if (
        contains(crossing, pos) &&
        (crossing.axis === 'x'
          ? Math.abs(dx) > Math.abs(dy)
          : Math.abs(dy) > Math.abs(dx))
      ) {
        this.crossing = crossing;
        break;
      }
    }
    this.cycleSignal = undefined;
    const bikeInfra =
      this.zone?.kind === 'bike_lane' || this.zone?.kind === 'bike_path';
    if (this.crossing?.kind === 'bike' && this.crossing.signal)
      this.cycleSignal = this.crossing;
    else if (bikeInfra) {
      for (const crossing of this.world.crossings) {
        if (
          crossing.kind === 'bike' &&
          crossing.signal &&
          (crossing.axis === 'x'
            ? Math.abs(dx) > Math.abs(dy)
            : Math.abs(dy) > Math.abs(dx)) &&
          distanceInto(crossing, pos, heading) <= 3
        ) {
          this.cycleSignal = crossing;
          break;
        }
      }
    }
    this.roadway = undefined;
    if (!this.zone || this.zone.kind === 'roadway') {
      const horizontal = Math.abs(dx) > Math.abs(dy);
      this.roadway = this.world.zones.find(
        (zone) =>
          zone.kind === 'roadway' &&
          zone.width > zone.height === horizontal &&
          contains(zone, pos),
      );
    }
    this.intersection = undefined;
    for (const intersection of this.world.intersections) {
      if (!contains(intersection, pos)) continue;
      this.intersection = intersection;
      break;
    }
    this.lane = this.intersection
      ? undefined
      : this.world.approachAt(pos, heading, this.zone);
    this.parallelBikeInfra =
      this.zone?.kind === 'roadway' && !this.crossing
        ? this.lane?.parallelBikeInfra
        : undefined;
    this.followsBikePath = false;
    if (this.zone?.kind === 'bike_path' || this.zone?.kind === 'bike_lane') {
      const direction = this.zone.direction && sideVector[this.zone.direction];
      this.followsBikePath =
        !direction || dx * direction.x + dy * direction.y >= Math.SQRT1_2;
    }
  }
}
