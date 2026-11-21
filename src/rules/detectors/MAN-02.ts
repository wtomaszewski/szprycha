import { verdict, type RiderState } from '../types';
import type { ZoneTracker } from '../world/ZoneTracker';
import type { Intersection } from '../world/WorldModel';
import {
  EDGE_TOLERANCE,
  rightEdgeDistance,
  RIGHT_EDGE_RANGE,
} from './GDZIE-03';

export class RightTurnDetector {
  private approach?: number;
  private junction?: Intersection;
  private entryHeading?: number;

  evaluate(rider: RiderState, zones: ZoneTracker, at: number) {
    if (rider.mode !== 'riding') {
      this.junction = undefined;
      this.approach = undefined;
      return;
    }
    const { intersection, roadway } = zones;
    if (intersection) {
      if (this.junction !== intersection) {
        this.junction = intersection;
        this.entryHeading =
          this.approach === undefined ? undefined : this.heading;
      }
      return;
    }

    const distance = roadway
      ? rightEdgeDistance(roadway, rider.pos, rider.heading)
      : undefined;
    const approach = this.approach;
    const entryHeading = this.entryHeading;
    const junction = this.junction;
    this.junction = undefined;
    this.approach = distance;
    this.heading = rider.heading;
    if (
      !junction ||
      entryHeading === undefined ||
      approach === undefined ||
      distance === undefined
    )
      return;
    const dx = Math.cos(entryHeading);
    const dy = Math.sin(entryHeading);
    const rightExit =
      (rider.pos.y - junction.y - junction.height / 2) * dx -
        (rider.pos.x - junction.x - junction.width / 2) * dy >=
      (Math.abs(dx) * junction.height + Math.abs(dy) * junction.width) / 2 -
        EDGE_TOLERANCE;
    const turn = rider.heading - entryHeading;
    const angle = Math.atan2(Math.sin(turn), Math.cos(turn));
    if (
      rightExit &&
      angle > Math.PI / 4 &&
      angle < (3 * Math.PI) / 4 &&
      Math.max(approach, distance) > RIGHT_EDGE_RANGE + EDGE_TOLERANCE
    )
      return verdict(
        'MAN-02',
        'minor',
        at,
        rider,
        { approach, exit: distance },
        { zoneId: junction.id },
      );
  }

  private heading = 0;
}
