import { describe, expect, it } from 'vitest';
import {
  REPLAY_CAPACITY,
  REPLAY_SECONDS,
  ReplayBuffer,
} from '../../src/gameplay/ReplayBuffer';
import { FIXED_STEP, stepRider, type Rider } from '../../src/gameplay/bicycle';
import { TICKS_PER_SECOND, type AgentState } from '../../src/rules/types';

const capture = (frames: number) => {
  const player: Rider = {
    x: 100,
    y: 100,
    heading: 0,
    speed: 0,
    walking: false,
  };
  const actions = { signal: null, looking: false, bell: false, lights: false };
  const agent: AgentState & { active: boolean } = {
    id: 'emergency',
    kind: 'emergency',
    pos: { x: 3, y: 10 },
    heading: 0,
    speed: 1,
    active: true,
    signalActive: true,
  };
  const prop = { x: 0, y: 0, active: true, heading: 0 };
  const buffer = new ReplayBuffer(1, 1);
  for (let tick = 0; tick < frames; tick++) {
    stepRider(
      player,
      { x: 0, y: -1, brake: false, scheme: 'classic' },
      [],
      5000,
      5000,
    );
    agent.pos.x = tick / 10;
    agent.active = tick % 2 === 0;
    agent.signalActive = tick % 3 === 0;
    prop.x++;
    buffer.record(
      tick * FIXED_STEP,
      tick >= 300,
      player,
      actions,
      [agent],
      [prop],
    );
  }
  player.x = agent.pos.x = prop.x = -1;
  return buffer;
};

describe('five-second replay', () => {
  it('wraps at five seconds plus the endpoint without changing chronological order', () => {
    const buffer = capture(REPLAY_CAPACITY * 2 + 78);
    expect(buffer.size).toBe(REPLAY_SECONDS * TICKS_PER_SECOND + 1);
    expect(buffer.durationMs).toBe(5000);
    const first = buffer.frameAt(0)!;
    const last = buffer.frameAt(5000)!;
    expect(last.at - first.at).toBeCloseTo(5);
    expect(last.rider.x).toBeGreaterThan(first.rider.x);
    expect(last.actors[0]?.x).toBeCloseTo((REPLAY_CAPACITY * 2 + 77) / 10);
    expect(last.props[0]?.x).toBe(REPLAY_CAPACITY * 2 + 78);
    expect(buffer.frame(buffer.size)).toBeUndefined();
  });

  it('reconstructs the same recorded states across playbacks and input runs', () => {
    const first = capture(137);
    const second = capture(137);
    const playback = (buffer: ReplayBuffer) =>
      Array.from({ length: buffer.size }, (_, index) => buffer.frame(index));
    expect(playback(first)).toEqual(playback(second));
    expect(first.frameAt(1000)).toBe(first.frame(60));
    expect(first.frameAt(1500)).toBe(first.frame(90));
    expect(first.frameAt(first.durationMs)?.rider.x).toBe(
      first.frame(136)?.rider.x,
    );
    expect(first.durationMs).toBeCloseTo((136 * 1000) / 60);
    first.clear();
    expect(first.size).toBe(0);
    expect(first.frameAt(0)).toBeUndefined();
    expect(first.durationMs).toBe(0);
  });
});

it('records traffic lamps and both tram section headings for playback', () => {
  const buffer = new ReplayBuffer(2);
  const player = { x: 0, y: 0, speed: 0, heading: 0, walking: false };
  const actions = { signal: null, looking: false, bell: false, lights: false };
  const car: AgentState = {
    id: 'turning',
    kind: 'car',
    pos: { x: 0, y: 0 },
    speed: 3,
    heading: 0,
    maneuver: 'left',
  };
  const tram = {
    ...car,
    kind: 'tram' as const,
    tramHeadings: { front: 0.4, rear: 0.1 },
  };
  buffer.record(0, false, player, actions, [car, tram]);
  car.speed = 2.5;
  car.maneuver = 'right';
  tram.tramHeadings.front = 0.6;
  buffer.record(FIXED_STEP, false, player, actions, [car, tram]);

  expect(buffer.frame(0)?.actors[0]).toMatchObject({
    braking: false,
    maneuver: 'left',
  });
  expect(buffer.frame(1)?.actors[0]).toMatchObject({
    braking: true,
    maneuver: 'right',
  });
  expect(buffer.frame(0)?.actors[1]).toMatchObject({
    tramFront: 0.4,
    tramRear: 0.1,
  });
  expect(buffer.frame(1)?.actors[1]).toMatchObject({
    tramFront: 0.6,
    tramRear: 0.1,
  });
});
