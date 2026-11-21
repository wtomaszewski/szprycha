import type { Rider, RiderState } from './bicycle';
import { TICKS_PER_SECOND, type AgentState } from '../rules/types';

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
}

export interface ReplayFrame {
  at: number;
  dusk: boolean;
  rider: Rider;
  actions: RiderState;
  actors: readonly ReplayActor[];
  props: readonly ReplayProp[];
}

type TrafficActor = AgentState & { active?: boolean };

export class ReplayBuffer {
  private readonly frames: readonly ReplayFrame[];
  private next = 0;
  private count = 0;

  constructor(actorCount: number, propCount = 0) {
    const pose = () => ({ x: 0, y: 0, heading: 0, active: false });
    this.frames = Array.from({ length: REPLAY_CAPACITY }, () => ({
      at: 0,
      dusk: false,
      rider: { x: 0, y: 0, heading: 0, speed: 0, walking: false },
      actions: { signal: null, looking: false, bell: false, lights: false },
      actors: Array.from({ length: actorCount }, () => ({
        ...pose(),
        speed: 0,
        signalActive: false,
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
    dusk: boolean,
    rider: Rider,
    actions: RiderState,
    actors: readonly TrafficActor[],
    props: readonly ReplayProp[] = [],
    signal = actions.signal,
  ) {
    const frame = this.frames[this.next]!;
    frame.at = at;
    frame.dusk = dusk;
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
