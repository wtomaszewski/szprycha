import { TICKS_PER_SECOND, verdict, type RiderState } from '../types';
import {
  lateralOffset,
  sideVector,
  type Driveway,
  type Intersection,
  type Lane,
} from '../world/WorldModel';
import type { ZoneTracker } from '../world/ZoneTracker';

const minTurn = Math.PI / 4;
const headingDifference = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));

export class ManeuverDetector {
  private signal: RiderState['signal'] = 'none';
  activeSignal: RiderState['signal'] = 'none';
  private signalUsed = false;
  private signalSince = 0;
  private intersection?: Intersection;
  private lane?: Lane;
  private driveway?: Driveway;
  private drivewayMarked = false;
  private drivewayEntry?: { signal: RiderState['signal']; held: number };
  private heading = 0;
  junctionEntryHeading?: number;
  turnedLeft = false;
  private offset = 0;
  private lateralDirection = 0;
  private lastOffset = 0;
  private stillSince = 0;
  private marked = false;
  private maneuverSignal: RiderState['signal'] = 'none';
  private heldBefore = 0;

  constructor(private readonly minimum: number) {}

  updateSignal(rider: RiderState, tick: number) {
    if (this.signal !== rider.signal) {
      this.signal = rider.signal;
      this.signalSince = tick;
      this.signalUsed = false;
    }
    const expired = tick - this.signalSince >= 6 * TICKS_PER_SECOND;
    this.activeSignal =
      expired || this.signalUsed || rider.mode !== 'riding'
        ? 'none'
        : this.signal;
  }

  signalingFor(tick: number) {
    return (
      this.activeSignal !== 'none' &&
      (tick - this.signalSince) / TICKS_PER_SECOND >= this.minimum
    );
  }

  evaluate(rider: RiderState, zones: ZoneTracker, tick: number) {
    this.junctionEntryHeading = undefined;
    this.turnedLeft = false;
    if (rider.mode !== 'riding') {
      this.intersection = undefined;
      this.lane = undefined;
      this.driveway = undefined;
      this.drivewayEntry = undefined;
      return;
    }

    const timeHeld = (tick - this.signalSince) / TICKS_PER_SECOND;
    const currentSignal = this.activeSignal;
    if (zones.driveway !== this.driveway) {
      this.driveway = zones.driveway;
      this.drivewayEntry = undefined;
      this.drivewayMarked = false;
    }
    if (this.driveway && !zones.intersection) {
      const direction = sideVector[this.driveway.direction];
      const turn = headingDifference(
        rider.heading,
        Math.atan2(direction.y, direction.x),
      );
      if (zones.zone?.kind === 'sidewalk' && Math.abs(turn) < minTurn)
        this.drivewayEntry ??= { signal: currentSignal, held: timeHeld };
      if (
        this.drivewayEntry &&
        zones.zone?.kind === 'roadway' &&
        rider.speed > 0 &&
        !this.drivewayMarked &&
        Math.abs(turn) > minTurn
      ) {
        this.drivewayMarked = true;
        return this.result(
          rider,
          tick,
          turn,
          this.drivewayEntry.signal,
          this.drivewayEntry.held,
          this.driveway.id,
        );
      }
    }
    if (zones.intersection) {
      if (zones.intersection !== this.intersection) {
        this.intersection = zones.intersection;
        const forward = this.lane?.forward;
        this.heading = forward
          ? Math.atan2(forward.y, forward.x)
          : rider.heading;
        this.junctionEntryHeading = this.heading;
        this.maneuverSignal = currentSignal;
        this.heldBefore = timeHeld;
        this.marked = false;
      }
      const turn = headingDifference(rider.heading, this.heading);
      if (rider.speed > 0 && !this.marked && Math.abs(turn) > minTurn + 1e-9) {
        this.marked = true;
        this.turnedLeft = turn < 0;
        return this.result(
          rider,
          tick,
          turn,
          this.maneuverSignal,
          this.heldBefore,
          this.intersection.id,
        );
      }
      return;
    }

    if (this.intersection) {
      this.intersection = undefined;
      this.lane = undefined;
    }
    const lane = this.lane;
    if (rider.speed > 0 && lane) {
      const current = lateralOffset(lane, rider.pos);
      const displacement = current - this.offset;
      if (Math.abs(current - this.lastOffset) > 0.005) this.stillSince = tick;
      this.lastOffset = current;
      if (this.marked && tick - this.stillSince >= TICKS_PER_SECOND / 2) {
        this.offset = current;
        this.marked = false;
        this.lateralDirection = 0;
      } else if (!this.marked) {
        if (Math.abs(displacement) <= 0.15) this.lateralDirection = 0;
        else if (this.lateralDirection !== Math.sign(displacement)) {
          this.lateralDirection = Math.sign(displacement);
          this.maneuverSignal = currentSignal;
          this.heldBefore = timeHeld;
        }
        if (Math.abs(displacement) > 1) {
          this.marked = true;
          return this.result(
            rider,
            tick,
            displacement,
            this.maneuverSignal,
            this.heldBefore,
            lane.id,
          );
        }
      }
      if (zones.lane === lane) return;
    }
    if (this.lane !== zones.lane) {
      this.lane = zones.lane;
      this.offset = this.lane ? lateralOffset(this.lane, rider.pos) : 0;
      this.marked = false;
      this.lateralDirection = 0;
      this.lastOffset = this.offset;
      this.stillSince = tick;
    }
  }

  private result(
    rider: RiderState,
    tick: number,
    turn: number,
    signal: RiderState['signal'],
    held: number,
    zoneId: string,
  ) {
    this.signalUsed = true;
    this.activeSignal = 'none';
    const direction = turn > 0 ? 'right' : 'left';
    const good = direction === signal && held >= this.minimum;
    return verdict(
      'MAN-01',
      good ? 'good' : 'minor',
      tick / TICKS_PER_SECOND,
      rider,
      { direction, signal, seconds: signal === 'none' ? 0 : held },
      { zoneId },
    );
  }
}
