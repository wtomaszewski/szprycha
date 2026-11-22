import type { PlacBalance, PlacCourse } from '../../content/plac';
import {
  BRAKE_DECELERATION,
  FIXED_STEP,
  stepRider,
  type DriveInput,
  type Rider,
  type RiderState,
} from '../bicycle';
import type { PlacSample } from './detectors/types';

const radians = Math.PI / 180;
const feetSpeed = 1;
const noObstacles = [] as const;

export class PlacRide {
  readonly rider: Rider;
  readonly sample: PlacSample;
  private readonly tuning;
  private readonly input: DriveInput = {
    x: 0,
    y: 0,
    brake: false,
    scheme: 'classic',
  };
  private started = false;
  private stoppedTicks = 0;
  ticks = 0;
  brakePressure = 0;

  constructor(
    private readonly course: Pick<PlacCourse, 'width' | 'height'>,
    start: Pick<Rider, 'x' | 'y' | 'heading'>,
    private readonly physics: PlacBalance['physics'],
    actions: RiderState,
  ) {
    this.rider = { ...start, speed: 0, walking: false };
    this.tuning = { maxSpeed: physics.max_speed, brakeForce: 0, driftAngle: 0 };
    this.sample = {
      rider: this.rider,
      previous: { x: start.x, y: start.y },
      actions,
      footDown: false,
      skidding: false,
    };
  }

  get visualHeading() {
    return this.rider.heading + this.tuning.driftAngle;
  }

  step(input: DriveInput) {
    const { physics, rider, sample, tuning } = this;
    const target =
      input.brake || (input.scheme === 'classic' && input.y > 0.1)
        ? (input.brakePressure ?? 1)
        : 0;
    this.brakePressure = Math.min(
      target,
      this.brakePressure + physics.brake_rise_per_s * FIXED_STEP,
    );
    sample.skidding =
      this.brakePressure >= physics.lock_pressure &&
      rider.speed >= physics.lock_speed;
    tuning.brakeForce = sample.skidding
      ? physics.skid_brake_force
      : this.brakePressure * BRAKE_DECELERATION;
    const seconds = ++this.ticks * FIXED_STEP;
    const instability = Math.max(0, 1 - rider.speed / physics.balance_speed);
    const wobble =
      Math.sin(seconds * 2 * Math.PI * physics.wobble_hz) *
      instability *
      physics.wobble_degrees;
    const signal = sample.actions.signal;
    tuning.driftAngle =
      radians *
      (wobble +
        (signal === 'left'
          ? -physics.one_hand_degrees
          : signal === 'right'
            ? physics.one_hand_degrees
            : 0));
    sample.previous.x = rider.x;
    sample.previous.y = rider.y;
    Object.assign(this.input, input);
    this.input.brake = this.brakePressure > 0;
    stepRider(
      rider,
      this.input,
      noObstacles,
      this.course.width,
      this.course.height,
      FIXED_STEP,
      tuning,
    );
    this.started ||= rider.speed >= feetSpeed;
    this.stoppedTicks =
      this.started && rider.speed < feetSpeed ? this.stoppedTicks + 1 : 0;
    sample.footDown = this.stoppedTicks * FIXED_STEP >= physics.foot_delay_s;
    return sample;
  }
}
