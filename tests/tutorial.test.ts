import { expect, it } from 'vitest';
import { Tutorial } from '../src/gameplay/Tutorial';
import type { DriveInput, RiderState } from '../src/gameplay/bicycle';
import { FIXED_STEP } from '../src/gameplay/bicycle';

const origin = { x: 0, y: 0, heading: 0 };
const stopped = { ...origin, speed: 0, walking: false };
const idle = {
  x: 0,
  y: 0,
  brake: false,
  scheme: 'classic',
} satisfies DriveInput;
const handsOnBars = {
  signal: null,
  looking: false,
  lights: false,
  bell: false,
} satisfies RiderState;

it.each(['left', 'right'] as const)(
  'requires an early %s signal and a moving turn',
  (side) => {
    const lesson = new Tutorial(side, 1.5);
    const heading = side === 'left' ? -0.7 : 0.7;
    const sample = (
      signal: RiderState['signal'],
      angle: number,
      speed: number,
    ) =>
      lesson.ride(
        { ...stopped, heading: angle, speed },
        origin,
        idle,
        { ...handsOnBars, signal },
        FIXED_STEP,
        undefined,
      );

    expect(sample(side, heading, 25)).toBe('signalFirst');
    lesson.resetAttempt();
    for (let i = 0; i < 89; i++) expect(sample(side, 0, 0)).toBeUndefined();
    expect(sample(side, heading, 25)).toBe('signalFirst');

    lesson.resetAttempt();
    let result;
    for (let i = 0; i < 91 && !result; i++) result = sample(side, 0, 0);
    expect(result).toBe('turnNow');
    expect(sample(null, 0, 0)).toBe('signalFirst');
    expect(sample(side, heading / 2, 15)).toBeUndefined();
    expect(sample(null, heading, 25)).toBe('pass');
  },
);

it('requires movement and braking when resuming the brake lesson', () => {
  const lesson = new Tutorial('brake', 1.5);
  const sample = (speed: number, brake: boolean) =>
    lesson.ride(
      { ...stopped, speed },
      origin,
      { ...idle, brake },
      handsOnBars,
      FIXED_STEP,
      undefined,
    );
  expect(sample(0, true)).toBeUndefined();
  expect(sample(20, false)).toBeUndefined();
  expect(sample(0, false)).toBeUndefined();
  expect(sample(16, true)).toBeUndefined();
  expect(sample(0, false)).toBe('pass');
});
