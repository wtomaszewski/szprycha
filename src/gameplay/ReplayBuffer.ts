import { animateGlance, animateSignal } from '../render/spriteFrames';
import type { Rider, RiderState } from './bicycle';
import {
  TICKS_PER_SECOND,
  type AgentState,
  type EnvState,
} from '../rules/types';

export const REPLAY_SECONDS = 5;
// Include the first and last sample so a full replay spans exactly five seconds.
export const REPLAY_CAPACITY = REPLAY_SECONDS * TICKS_PER_SECOND + 1;

export interface ReplayProp {
  x: number;
  y: number;
  heading: number;
  active: boolean;
}

export interface ReplayActor extends ReplayProp {
  speed: number;
  signalActive: boolean;
  stride: number;
  trips: number;
  braking: boolean;
  maneuver?: AgentState['maneuver'];
  tramFront: number;
  tramRear: number;
}

type ReplayEnvironment = Pick<EnvState, 'time' | 'weather' | 'visibilityLow'>;

export interface ReplayFrame {
  at: number;
  environment: ReplayEnvironment;
  reflectiveVest: boolean;
  rider: Rider;
  riderStride: number;
  signalReach: number;
  glance: number;
  dismountAt: number;
  actions: RiderState;
  actors: readonly ReplayActor[];
  props: readonly ReplayProp[];
}

type TrafficActor = AgentState & {
  active?: boolean;
  trips?: number;
  tramHeadings?: { front: number; rear: number };
};

export class ReplayBuffer {
  private readonly frames: readonly ReplayFrame[];
  private next = 0;
  private count = 0;

  constructor(actorCount: number, propCount = 0) {
    const pose = () => ({ x: 0, y: 0, heading: 0, active: false });
    this.frames = Array.from({ length: REPLAY_CAPACITY }, () => ({
      at: 0,
      environment: { time: 'day', weather: 'clear', visibilityLow: false },
      reflectiveVest: false,
      rider: { x: 0, y: 0, heading: 0, speed: 0, walking: false },
      riderStride: 0,
      signalReach: 0,
      glance: 0,
      dismountAt: -Infinity,
      actions: { signal: null, looking: false, bell: false, lights: false },
      actors: Array.from({ length: actorCount }, () => ({
        ...pose(),
        speed: 0,
        signalActive: false,
        stride: 0,
        trips: 0,
        braking: false,
        tramFront: 0,
        tramRear: 0,
      })),
      props: Array.from({ length: propCount }, pose),
    }));
  }

  get size() {
    return this.count;
  }

  clear() {
    this.next = this.count = 0;
  }

  record(
    at: number,
    environment: ReplayEnvironment,
    rider: Rider,
    actions: RiderState,
    actors: readonly TrafficActor[],
    props: readonly ReplayProp[] = [],
    signal = actions.signal,
    reflectiveVest = false,
  ) {
    const frame = this.frames[this.next]!;
    const previous = this.frame(this.count - 1);
    const elapsed = previous ? Math.max(0, at - previous.at) : 0;
    const modeChanged = previous && previous.rider.walking !== rider.walking;
    frame.dismountAt = modeChanged
      ? rider.walking
        ? at
        : -Infinity
      : (previous?.dismountAt ?? -Infinity);
    frame.riderStride =
      ((modeChanged ? 0 : (previous?.riderStride ?? 0)) +
        (rider.speed * elapsed) / (rider.walking ? 20 : 32)) %
      1;
    frame.signalReach = rider.walking
      ? 0
      : animateSignal(previous?.signalReach ?? 0, signal, elapsed);
    frame.glance = rider.walking
      ? 0
      : animateGlance(previous?.glance ?? 0, actions.looking, elapsed);
    frame.at = at;
    frame.environment.time = environment.time;
    frame.environment.weather = environment.weather;
    frame.environment.visibilityLow = environment.visibilityLow;
    frame.reflectiveVest = reflectiveVest;
    frame.rider.x = rider.x;
    frame.rider.y = rider.y;
    frame.rider.heading = rider.heading;
    frame.rider.speed = rider.speed;
    frame.rider.walking = rider.walking;
    frame.actions.signal = signal;
    frame.actions.looking = actions.looking;
    frame.actions.bell = actions.bell;
    frame.actions.lights = actions.lights;
    for (let i = 0; i < actors.length; i++) {
      const source = actors[i]!;
      const pose = frame.actors[i]!;
      pose.x = source.pos.x;
      pose.y = source.pos.y;
      pose.heading = source.heading;
      pose.active = source.active !== false;
      pose.speed = source.speed;
      pose.signalActive = source.signalActive === true;
      const was = previous?.actors[i];
      const movingBefore = pose.active && was?.active;
      pose.trips = source.trips ?? 0;
      if (
        pose.active &&
        (source.kind === 'pedestrian' || source.kind === 'cyclist')
      ) {
        const strideRate = source.kind === 'pedestrian' ? 1.25 : 0.625;
        pose.stride =
          ((movingBefore ? was.stride : 0) +
            source.speed * elapsed * strideRate) %
          1;
      }
      pose.braking =
        source.speed < 0.15 ||
        source.protectiveBrake === true ||
        (movingBefore === true && was.speed - source.speed > 0.02);
      pose.maneuver = source.maneuver;
      pose.tramFront = source.tramHeadings?.front ?? source.heading;
      pose.tramRear = source.tramHeadings?.rear ?? source.heading;
    }
    for (let i = 0; i < props.length; i++) {
      const source = props[i]!;
      const pose = frame.props[i]!;
      pose.x = source.x;
      pose.y = source.y;
      pose.heading = source.heading;
      pose.active = source.active;
    }
    this.next = (this.next + 1) % REPLAY_CAPACITY;
    this.count = Math.min(REPLAY_CAPACITY, this.count + 1);
  }

  /** Oldest first. Frames are reusable storage and only stable while recording is paused. */
  frame(index: number) {
    if (index < 0 || index >= this.count) return undefined;
    return this.frames[
      (this.next - this.count + index + REPLAY_CAPACITY) % REPLAY_CAPACITY
    ];
  }

  frameAt(elapsedMs: number) {
    const index =
      elapsedMs >= this.durationMs
        ? this.count - 1
        : Math.floor((Math.max(0, elapsedMs) * TICKS_PER_SECOND) / 1000);
    return this.frame(index);
  }

  get durationMs() {
    return (Math.max(0, this.count - 1) * 1000) / TICKS_PER_SECOND;
  }
}
